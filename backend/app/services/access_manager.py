import re
import json
import secrets
import hashlib
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import ClientLicense, SystemAccessConfig


class AccessManager:
    @staticmethod
    def hash_password(password: str) -> str:
        """Computes SHA-256 hash of plaintext password."""
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Secure comparison of plaintext password against stored hash."""
        if not hashed:
            return False
        computed = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return secrets.compare_digest(computed, hashed)

    @staticmethod
    def get_or_create_config(db: Session) -> SystemAccessConfig:
        """Fetches system access configuration or creates default."""
        cfg = db.query(SystemAccessConfig).first()
        if not cfg:
            default_hash = AccessManager.hash_password("admin123")
            cfg = SystemAccessConfig(
                id="default_config",
                is_global_locked=False,
                lock_message="Aap ka access admin ki taraf se revoke kar diya gaya hai. Barah-e-karam admin se rabta karein.",
                remote_kill_switch_enabled=False,
                remote_kill_switch_url="",
                admin_password_hash=default_hash,
            )
            db.add(cfg)
            db.commit()
            db.refresh(cfg)
        return cfg

    @staticmethod
    def generate_license_key(client_name: str) -> str:
        """
        Generates a human-readable, cryptographically unique client license key.
        Format: GDUB-<CLIENT_SLUG>-<4_DIGIT_HEX>-<4_DIGIT_HEX>
        Example: GDUB-ALI-A7B2-91C4
        """
        slug = re.sub(r"[^A-Za-z0-9]", "", client_name.upper())[:6] or "CLIENT"
        rand_part1 = secrets.token_hex(2).upper()
        rand_part2 = secrets.token_hex(2).upper()
        return f"GDUB-{slug}-{rand_part1}-{rand_part2}"

    @staticmethod
    def check_remote_kill_switch(url: str, license_key: Optional[str] = None) -> Tuple[bool, str]:
        """
        Queries an external JSON URL (e.g. GitHub Gist / Pastebin / JSONbin) to verify
        if the tool or specific client key has been remotely revoked by the owner.
        Expected JSON format:
        {
          "is_active": true,
          "revoked_keys": ["KEY_1", "KEY_2"],
          "message": "Access has been revoked remotely."
        }
        """
        if not url or not url.strip().startswith("http"):
            return True, "No remote URL configured."

        try:
            req = urllib.request.Request(
                url.strip(),
                headers={"User-Agent": "GlobalDub-License-Verifier/1.0"}
            )
            with urllib.request.urlopen(req, timeout=3.5) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            custom_msg = data.get("message") or "Access remotely revoked by administrator."

            # 1. Global kill check in remote payload
            if data.get("is_active") is False or data.get("locked") is True:
                return False, custom_msg

            # 2. Check if this specific license key is in revoked list
            revoked_keys = [str(k).upper().strip() for k in data.get("revoked_keys", [])]
            if license_key and license_key.upper().strip() in revoked_keys:
                return False, f"License '{license_key}' has been remotely revoked by admin."

            # 3. Optional whitelist enforcement if remote provides allowed_keys
            allowed_keys = data.get("allowed_keys")
            if allowed_keys is not None and isinstance(allowed_keys, list):
                allowed_keys_upper = [str(k).upper().strip() for k in allowed_keys]
                if license_key and license_key.upper().strip() not in allowed_keys_upper:
                    return False, f"License '{license_key}' is not authorized on remote registry."

            return True, "Remote check passed."
        except urllib.error.URLError as e:
            # Network issue or timeout - allow soft fallback to local license
            print(f"[AccessManager] Remote kill switch URL unreachable: {e}")
            return True, "Remote unreachable (grace fallback)."
        except Exception as e:
            print(f"[AccessManager] Remote kill switch check error: {e}")
            return True, f"Remote check warning: {e}"

    @staticmethod
    def validate_access(db: Session, license_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Comprehensive access verification:
        1. Checks System-wide Global Lock (Master Kill Switch)
        2. Checks Remote Kill-Switch URL if enabled
        3. Checks Specific Client License (Active, Revoked, Suspended, Expired)
        """
        cfg = AccessManager.get_or_create_config(db)

        # 1. Master Global Lock check
        if cfg.is_global_locked:
            return {
                "allowed": False,
                "reason": "global_lock",
                "message": cfg.lock_message or "Tool access is currently locked by administrator.",
                "is_locked": True,
            }

        # Normalize key if given
        norm_key = license_key.strip() if license_key else None

        # 2. Remote Kill Switch check
        if cfg.remote_kill_switch_enabled and cfg.remote_kill_switch_url:
            remote_ok, remote_msg = AccessManager.check_remote_kill_switch(
                cfg.remote_kill_switch_url, norm_key
            )
            if not remote_ok:
                return {
                    "allowed": False,
                    "reason": "remote_revoked",
                    "message": remote_msg,
                    "is_locked": True,
                }

        # 3. Specific License verification
        if norm_key:
            lic = db.query(ClientLicense).filter(ClientLicense.license_key == norm_key).first()
            if not lic:
                return {
                    "allowed": False,
                    "reason": "invalid_key",
                    "message": f"License key '{norm_key}' is not recognized.",
                    "is_locked": True,
                }

            if lic.status == "revoked" or not lic.is_active:
                return {
                    "allowed": False,
                    "reason": "revoked",
                    "client_name": lic.client_name,
                    "license_key": lic.license_key,
                    "message": "Access Denied: Aap ka access admin ne revoke (khatam) kar diya hai.",
                    "is_locked": True,
                }

            if lic.status == "suspended":
                return {
                    "allowed": False,
                    "reason": "suspended",
                    "client_name": lic.client_name,
                    "license_key": lic.license_key,
                    "message": "Access Suspended: Aap ka account aarzi taur par band hai.",
                    "is_locked": True,
                }

            if lic.expires_at:
                now_utc = datetime.now(timezone.utc)
                exp = lic.expires_at.replace(tzinfo=timezone.utc) if lic.expires_at.tzinfo is None else lic.expires_at
                if exp < now_utc:
                    lic.status = "expired"
                    lic.is_active = False
                    db.commit()
                    return {
                        "allowed": False,
                        "reason": "expired",
                        "client_name": lic.client_name,
                        "license_key": lic.license_key,
                        "message": "Access Expired: Aap ke license ki muddat khatam ho chuki hai.",
                        "is_locked": True,
                    }

            # Update last used
            lic.last_used_at = datetime.now(timezone.utc)
            db.commit()

            features = {}
            try:
                features = json.loads(lic.allowed_features or "{}")
            except Exception:
                features = {"ai_dubbing": True, "voice_over": True, "voice_cloning": False}

            return {
                "allowed": True,
                "reason": "valid",
                "client_name": lic.client_name,
                "license_key": lic.license_key,
                "status": lic.status,
                "expires_at": lic.expires_at.isoformat() if lic.expires_at else None,
                "features": features,
                "is_locked": False,
            }

        # If no key passed in header/request, check if any active license exists in system
        first_active = db.query(ClientLicense).filter(
            ClientLicense.is_active == True,
            ClientLicense.status == "active"
        ).order_by(ClientLicense.created_at.desc()).first()

        if first_active:
            # Check expiry
            if first_active.expires_at:
                now_utc = datetime.now(timezone.utc)
                exp = first_active.expires_at.replace(tzinfo=timezone.utc) if first_active.expires_at.tzinfo is None else first_active.expires_at
                if exp < now_utc:
                    first_active.status = "expired"
                    first_active.is_active = False
                    db.commit()
                    return {
                        "allowed": False,
                        "reason": "expired",
                        "client_name": first_active.client_name,
                        "license_key": first_active.license_key,
                        "message": "Access Expired: Aap ke license ki muddat khatam ho chuki hai.",
                        "is_locked": True,
                    }

            features = {}
            try:
                features = json.loads(first_active.allowed_features or "{}")
            except Exception:
                features = {"ai_dubbing": True, "voice_over": True, "voice_cloning": False}

            return {
                "allowed": True,
                "reason": "default_license",
                "client_name": first_active.client_name,
                "license_key": first_active.license_key,
                "status": first_active.status,
                "expires_at": first_active.expires_at.isoformat() if first_active.expires_at else None,
                "features": features,
                "is_locked": False,
            }

        # If no active license exists at all
        return {
            "allowed": False,
            "reason": "no_license",
            "message": "No active license found. Enter a valid license key or contact admin.",
            "is_locked": True,
        }
