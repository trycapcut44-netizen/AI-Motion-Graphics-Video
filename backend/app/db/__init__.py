from app.db.session import engine, SessionLocal, Base, get_db
import hashlib
from datetime import datetime, timezone, timedelta
from app.db.models import (
    User,
    Project,
    MediaAsset,
    TranscriptSegment,
    VoiceConfiguration,
    ProcessingJob,
    ConsentRecord,
    UsageRecord,
    ClientLicense,
    SystemAccessConfig,
)

def init_db():
    """Create all tables and seed default admin & demo users if table is empty."""
    Base.metadata.create_all(bind=engine)

    # Seed default users if empty
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            demo_users = [
                User(
                    id="admin-user-001",
                    email="admin@globaldub.ai",
                    username="admin",
                    full_name="System Administrator",
                    role="admin",
                    status="active",
                    is_active=True,
                    can_ai_dubbing=True,
                    can_voice_over=True,
                    can_clone_voice=True,
                    can_export_subtitles=True,
                    can_burn_subtitles=True,
                    tier="enterprise",
                    max_video_duration_minutes=180,
                    monthly_minutes_quota=1000,
                    used_minutes=15.5,
                ),
                User(
                    id="user-002",
                    email="bilal.creator@gmail.com",
                    username="bilal_creator",
                    full_name="Bilal Ahmed",
                    role="user",
                    status="active",
                    is_active=True,
                    can_ai_dubbing=True,
                    can_voice_over=True,
                    can_clone_voice=False,
                    can_export_subtitles=True,
                    can_burn_subtitles=True,
                    tier="pro",
                    max_video_duration_minutes=60,
                    monthly_minutes_quota=300,
                    used_minutes=42.0,
                ),
                User(
                    id="user-003",
                    email="sara.khan@youtube.com",
                    username="sara_vlogs",
                    full_name="Sara Khan",
                    role="user",
                    status="active",
                    is_active=True,
                    can_ai_dubbing=True,
                    can_voice_over=True,
                    can_clone_voice=False,
                    can_export_subtitles=True,
                    can_burn_subtitles=False,
                    tier="free",
                    max_video_duration_minutes=20,
                    monthly_minutes_quota=60,
                    used_minutes=18.2,
                ),
                User(
                    id="user-004",
                    email="restricted.account@test.com",
                    username="restricted_user",
                    full_name="Restricted Demo User",
                    role="user",
                    status="suspended",
                    is_active=False,  # Suspended by Admin
                    can_ai_dubbing=False,
                    can_voice_over=False,
                    can_clone_voice=False,
                    can_export_subtitles=False,
                    can_burn_subtitles=False,
                    tier="free",
                    max_video_duration_minutes=10,
                    monthly_minutes_quota=30,
                    used_minutes=30.0,
                ),
            ]
            db.add_all(demo_users)
            db.commit()

        # Seed default SystemAccessConfig if missing
        access_cfg = db.query(SystemAccessConfig).first()
        if not access_cfg:
            default_admin_hash = hashlib.sha256("admin123".encode()).hexdigest()
            access_cfg = SystemAccessConfig(
                id="default_config",
                is_global_locked=False,
                lock_message="Aap ka access admin ki taraf se revoke kar diya gaya hai. Barah-e-karam admin se rabta karein.",
                remote_kill_switch_enabled=False,
                remote_kill_switch_url="",
                admin_password_hash=default_admin_hash,
            )
            db.add(access_cfg)
            db.commit()

        # Seed sample client license if empty
        lic_count = db.query(ClientLicense).count()
        if lic_count == 0:
            demo_license = ClientLicense(
                license_key="GDUB-CLIENT-DEMO-2026",
                client_name="Demo Client (Sample)",
                status="active",
                is_active=True,
                expires_at=datetime.now(timezone.utc) + timedelta(days=365),
                allowed_features='{"ai_dubbing": true, "voice_over": true, "voice_cloning": true}',
                notes="Standard licensed access with AI Dubbing enabled",
                device_info="Local Workspace",
                last_used_at=datetime.now(timezone.utc),
            )
            db.add(demo_license)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to seed demo users: {e}")
    finally:
        db.close()
