import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(128), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(32), default="user", nullable=False)  # admin, user, editor, viewer
    status = Column(String(32), default="active", nullable=False)  # active, suspended, pending

    # Granular access controls (Admin can toggle each for any user)
    is_active = Column(Boolean, default=True, nullable=False)
    can_ai_dubbing = Column(Boolean, default=True, nullable=False)
    can_voice_over = Column(Boolean, default=True, nullable=False)
    can_clone_voice = Column(Boolean, default=False, nullable=False)
    can_export_subtitles = Column(Boolean, default=True, nullable=False)
    can_burn_subtitles = Column(Boolean, default=True, nullable=False)

    # Quotas and Limits
    tier = Column(String(32), default="free", nullable=False)  # free, pro, enterprise
    max_video_duration_minutes = Column(Integer, default=30, nullable=False)
    monthly_minutes_quota = Column(Integer, default=120, nullable=False)
    used_minutes = Column(Float, default=0.0, nullable=False)

    # Metadata
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    last_login_at = Column(DateTime, nullable=True)


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, default="Untitled Dub")
    owner_id = Column(String(64), nullable=True, default="local_user")
    source_language = Column(String(32), nullable=False, default="auto")
    target_language = Column(String(32), nullable=False, default="hi")
    status = Column(String(32), nullable=False, default="DRAFT")
    
    original_asset_id = Column(String(36), nullable=True)
    output_asset_id = Column(String(36), nullable=True)
    settings_json = Column(Text, nullable=True, default="{}")
    
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    assets = relationship("MediaAsset", back_populates="project", cascade="all, delete-orphan")
    segments = relationship("TranscriptSegment", back_populates="project", cascade="all, delete-orphan", order_by="TranscriptSegment.start_time")
    jobs = relationship("ProcessingJob", back_populates="project", cascade="all, delete-orphan", order_by="ProcessingJob.created_at.desc()")
    voice_config = relationship("VoiceConfiguration", back_populates="project", uselist=False, cascade="all, delete-orphan")
    consent_record = relationship("ConsentRecord", back_populates="project", uselist=False, cascade="all, delete-orphan")
    usage_records = relationship("UsageRecord", back_populates="project", cascade="all, delete-orphan")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(64), nullable=False)  # ORIGINAL_VIDEO, EXTRACTED_AUDIO, FINAL_AUDIO, RENDERED_VIDEO, SUBTITLE_SRT, SUBTITLE_VTT
    private_storage_key = Column(String(255), nullable=False)  # filename on disk
    original_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True, default=0)
    mime_type = Column(String(128), nullable=True)
    duration = Column(Float, nullable=True, default=0.0)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    fps = Column(Float, nullable=True)
    checksum = Column(String(64), nullable=True)
    expiration_at = Column(DateTime, nullable=True)
    deletion_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    project = relationship("Project", back_populates="assets")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    speaker_id = Column(String(64), default="Speaker 1")
    speaker_gender = Column(String(16), default="male", nullable=True)
    voice_id = Column(String(128), nullable=True)
    start_time = Column(Float, nullable=False)  # in seconds
    end_time = Column(Float, nullable=False)    # in seconds
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=True)
    audio_asset_id = Column(String(36), nullable=True)  # synthesized audio snippet
    edit_version = Column(Integer, default=1)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    project = relationship("Project", back_populates="segments")

    __table_args__ = (
        Index("idx_segment_project_start", "project_id", "start_time"),
    )


class VoiceConfiguration(Base):
    __tablename__ = "voice_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    provider = Column(String(64), default="edge_tts")  # "edge_tts", "gemini_tts", "gemini_replicated"
    voice_id = Column(String(128), nullable=False)
    voice_name = Column(String(128), nullable=True)
    gender = Column(String(16), default="female")
    language_code = Column(String(32), nullable=False)
    replication_enabled = Column(Boolean, default=False)
    speed = Column(Float, default=1.0)
    pitch = Column(Float, default=1.0)
    volume_gain = Column(Float, default=1.0)
    settings_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=utc_now)

    project = relationship("Project", back_populates="voice_config")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(64), default="QUEUED")  # QUEUED, EXTRACTING_AUDIO, TRANSCRIBING, TRANSLATING, AWAITING_REVIEW, GENERATING_SPEECH, SYNCHRONIZING, MIXING, RENDERING, VERIFYING, COMPLETED, FAILED, CANCELLED
    status = Column(String(32), default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress = Column(Integer, default=0)         # 0 - 100 percentage
    message = Column(Text, nullable=True)
    error_code = Column(String(64), nullable=True)
    error_details = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="jobs")

    __table_args__ = (
        Index("idx_job_project_created", "project_id", "created_at"),
    )


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    speaker_name = Column(String(128), nullable=False)
    consent_status = Column(String(32), default="GRANTED")  # GRANTED, REVOKED, PENDING
    consent_statement = Column(Text, nullable=False)
    reference_audio_key = Column(String(255), nullable=True)
    consent_audio_key = Column(String(255), nullable=True)
    provider_verification_reference = Column(String(255), nullable=True)
    recorded_at = Column(DateTime, default=utc_now)
    revoked_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="consent_record")


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(64), nullable=False)
    operation = Column(String(64), nullable=False)
    input_units = Column(Float, default=0.0)    # tokens or duration in seconds
    output_units = Column(Float, default=0.0)   # tokens or duration in seconds
    estimated_cost = Column(Float, default=0.0)
    currency = Column(String(8), default="USD")
    recorded_at = Column(DateTime, default=utc_now)

    project = relationship("Project", back_populates="usage_records")


class ClientLicense(Base):
    __tablename__ = "client_licenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    license_key = Column(String(128), unique=True, index=True, nullable=False)
    client_name = Column(String(255), nullable=False)
    status = Column(String(32), default="active", nullable=False)  # active, revoked, suspended, expired
    is_active = Column(Boolean, default=True, nullable=False)
    
    expires_at = Column(DateTime, nullable=True)  # None = Lifetime
    allowed_features = Column(Text, default='{"ai_dubbing": true, "voice_over": true, "voice_cloning": false}')
    
    notes = Column(Text, nullable=True)
    device_info = Column(String(255), nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class SystemAccessConfig(Base):
    __tablename__ = "system_access_config"

    id = Column(String(36), primary_key=True, default="default_config")
    is_global_locked = Column(Boolean, default=False, nullable=False)  # Global master kill-switch
    lock_message = Column(
        String(500),
        default="Aap ka access admin ki taraf se revoke kar diya gaya hai. Barah-e-karam admin se rabta karein."
    )
    
    # Remote kill switch URL (e.g. GitHub Gist / raw JSON)
    remote_kill_switch_enabled = Column(Boolean, default=False, nullable=False)
    remote_kill_switch_url = Column(String(500), nullable=True)
    
    # Admin master password hash (sha256)
    admin_password_hash = Column(String(255), nullable=True)
    
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

