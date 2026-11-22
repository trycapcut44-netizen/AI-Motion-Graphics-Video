import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import ClientLicense, SystemAccessConfig
from app.services.access_manager import AccessManager
from app.schemas.access import (
    AccessStatusResponse,
    VerifyKeyRequest,
    AdminLoginRequest,
    AdminLoginResponse,
    CreateLicenseRequest,
    ClientLicenseResponse,
    GlobalLockRequest,
    RemoteConfigRequest,
    ChangePasswordRequest,
)

router = APIRouter(prefix="/access", tags=["License & Access Management"])


def verify_admin_session(
    authorization: Optional[str] = Header(None),
    x_admin_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Ensures the caller has valid Master Admin credentials.
    Accepts Bearer token or X-Admin-Key matching the hashed password or admin token.
    """
    cfg = AccessManager.get_or_create_config(db)
    token = x_admin_key or (authorization.replace("Bearer ", "").strip() if authorization else None)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required. Barah-e-karam admin password enter karein."
        )

    # Verify token matches admin password hash
    if not AccessManager.verify_password(token, cfg.admin_password_hash) and token != cfg.admin_password_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ghalat Admin Password. Access Denied."
        )
    return True


@router.get("/status", response_model=AccessStatusResponse)
def get_access_status(
    license_key: Optional[str] = Query(None),
    x_license_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Checks current tool access and license validity.
    Returns whether client is allowed to proceed or locked out.
    """
    effective_key = license_key or x_license_key
    res = AccessManager.validate_access(db, effective_key)
    return AccessStatusResponse(**res)


@router.post("/verify-key", response_model=AccessStatusResponse)
def verify_key(payload: VerifyKeyRequest, db: Session = Depends(get_db)):
    """
    Explicitly tests/activates a client license key.
    """
    res = AccessManager.validate_access(db, payload.license_key)
    return AccessStatusResponse(**res)


@router.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    """
    Verifies Master Admin Password. Returns an admin session token.
    """
    cfg = AccessManager.get_or_create_config(db)
    if AccessManager.verify_password(payload.password, cfg.admin_password_hash):
        return AdminLoginResponse(
            authenticated=True,
            token=cfg.admin_password_hash,
            message="Admin authenticated successfully."
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ghalat Admin Password. Barah-e-karam durust password enter karein."
    )


@router.get("/admin/licenses", response_model=List[ClientLicenseResponse])
def list_client_licenses(
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Lists all issued client licenses and their active/revoked status.
    """
    return db.query(ClientLicense).order_by(ClientLicense.created_at.desc()).all()


@router.post("/admin/licenses", response_model=ClientLicenseResponse)
def create_client_license(
    payload: CreateLicenseRequest,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Generates a brand new client license key.
    """
    name = payload.client_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Client name is required.")

    new_key = AccessManager.generate_license_key(name)
    
    expires_at = None
    if payload.expires_in_days and payload.expires_in_days > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)

    features = payload.allowed_features or {
        "ai_dubbing": True,
        "voice_over": True,
        "voice_cloning": False
    }

    new_license = ClientLicense(
        license_key=new_key,
        client_name=name,
        status="active",
        is_active=True,
        expires_at=expires_at,
        allowed_features=json.dumps(features),
        notes=payload.notes,
        last_used_at=datetime.now(timezone.utc),
    )
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return new_license


@router.post("/admin/licenses/{license_id}/revoke", response_model=ClientLicenseResponse)
def revoke_client_license(
    license_id: str,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: INSTANT 1-CLICK REVOCATION!
    Instantly revokes access for this client. The client will be locked out immediately.
    """
    lic = db.query(ClientLicense).filter(ClientLicense.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found.")

    lic.status = "revoked"
    lic.is_active = False
    lic.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lic)
    return lic


@router.post("/admin/licenses/{license_id}/restore", response_model=ClientLicenseResponse)
def restore_client_license(
    license_id: str,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Re-activates a revoked or suspended license.
    """
    lic = db.query(ClientLicense).filter(ClientLicense.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found.")

    lic.status = "active"
    lic.is_active = True
    lic.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(lic)
    return lic


@router.delete("/admin/licenses/{license_id}")
def delete_client_license(
    license_id: str,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Permanently deletes a license.
    """
    lic = db.query(ClientLicense).filter(ClientLicense.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found.")

    db.delete(lic)
    db.commit()
    return {"message": f"License '{lic.license_key}' permanently deleted."}


@router.get("/admin/system-config")
def get_system_config(
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Retrieves current Master Kill-Switch and Remote URL configuration.
    """
    cfg = AccessManager.get_or_create_config(db)
    return {
        "is_global_locked": cfg.is_global_locked,
        "lock_message": cfg.lock_message,
        "remote_kill_switch_enabled": cfg.remote_kill_switch_enabled,
        "remote_kill_switch_url": cfg.remote_kill_switch_url or "",
        "updated_at": cfg.updated_at,
    }


@router.post("/admin/global-lock")
def toggle_global_lock(
    payload: GlobalLockRequest,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Master Tool Kill-Switch!
    When locked, ALL client access is immediately suspended platform-wide.
    """
    cfg = AccessManager.get_or_create_config(db)
    cfg.is_global_locked = payload.is_locked
    if payload.lock_message:
        cfg.lock_message = payload.lock_message.strip()
    cfg.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cfg)
    return {
        "is_global_locked": cfg.is_global_locked,
        "lock_message": cfg.lock_message,
        "message": "Tool locked successfully." if cfg.is_global_locked else "Tool unlocked successfully."
    }


@router.post("/admin/remote-config")
def update_remote_config(
    payload: RemoteConfigRequest,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Configures Remote Cloud Kill-Switch URL.
    """
    cfg = AccessManager.get_or_create_config(db)
    cfg.remote_kill_switch_enabled = payload.enabled
    cfg.remote_kill_switch_url = payload.url.strip() if payload.url else ""
    cfg.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "remote_kill_switch_enabled": cfg.remote_kill_switch_enabled,
        "remote_kill_switch_url": cfg.remote_kill_switch_url,
        "message": "Remote kill switch configuration updated."
    }


@router.post("/admin/remote-test")
def test_remote_url(
    payload: RemoteConfigRequest,
    _admin: bool = Depends(verify_admin_session)
):
    """
    Admin: Tests the remote URL live to see if it responds and what it returns.
    """
    if not payload.url or not payload.url.strip().startswith("http"):
        raise HTTPException(status_code=400, detail="Valid HTTP/HTTPS URL is required.")

    ok, msg = AccessManager.check_remote_kill_switch(payload.url)
    return {
        "success": ok,
        "message": msg
    }


@router.post("/admin/change-password")
def change_admin_password(
    payload: ChangePasswordRequest,
    _admin: bool = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    """
    Admin: Updates the Master Admin Password.
    """
    cfg = AccessManager.get_or_create_config(db)
    if not AccessManager.verify_password(payload.current_password, cfg.admin_password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(payload.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters.")

    cfg.admin_password_hash = AccessManager.hash_password(payload.new_password.strip())
    cfg.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "message": "Master Admin Password updated successfully.",
        "new_token": cfg.admin_password_hash
    }
