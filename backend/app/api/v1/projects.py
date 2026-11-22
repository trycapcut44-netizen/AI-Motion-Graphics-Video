import json
import uuid
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Header
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.db.models import Project, MediaAsset, VoiceConfiguration
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut
from app.services.media_inspector import MediaInspector
from app.services.cleanup import StorageCleaner
from app.services.access_manager import AccessManager

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectOut)
def create_project(
    payload: ProjectCreate,
    x_license_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Creates a new video dubbing project."""
    # Enforce license & access control
    access = AccessManager.validate_access(db, x_license_key)
    if not access["allowed"]:
        raise HTTPException(
            status_code=403,
            detail=access.get("message") or "Access Denied: Aap ka access admin ne revoke kar diya hai."
        )

    if payload.owner_id:
        from app.db.models import User
        user = db.query(User).filter(User.id == payload.owner_id).first()
        if user and (not user.is_active or user.status == "suspended"):
            raise HTTPException(
                status_code=403,
                detail="Access Denied: Aap ka account suspend kar diya gaya hai. Barah-e-karam admin se rabta karein."
            )

    settings_data = payload.settings.model_dump() if payload.settings else {}
    project = Project(
        name=payload.name,
        source_language=payload.source_language,
        target_language=payload.target_language,
        owner_id=payload.owner_id or "admin-user-001",
        status="DRAFT",
        settings_json=json.dumps(settings_data)
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Initialize VoiceConfiguration tailored to target language
    target_default_voices = {
        "ur": ("ur-PK-AsadNeural", "Asad (Urdu - Pakistan)", "male"),
        "hi": ("hi-IN-MadhurNeural", "Madhur (Hindi)", "male"),
        "en": ("en-US-GuyNeural", "Guy (English - US)", "male"),
        "ar": ("ar-SA-HamedNeural", "Hamed (Arabic - Saudi)", "male"),
        "es": ("es-ES-AlvaroNeural", "Alvaro (Spanish - Spain)", "male"),
        "fr": ("fr-FR-HenriNeural", "Henri (French - France)", "male"),
        "de": ("de-DE-ConradNeural", "Conrad (German - Germany)", "male"),
        "fil": ("fil-PH-AngeloNeural", "Angelo (Filipino - Philippines)", "male"),
        "tl": ("fil-PH-AngeloNeural", "Angelo (Filipino - Philippines)", "male"),
    }
    def_vid, def_name, def_gender = target_default_voices.get(
        payload.target_language,
        ("en-US-GuyNeural", "Guy (English - US)", "male")
    )
    voice_cfg = VoiceConfiguration(
        project_id=project.id,
        voice_id=settings_data.get("selected_voice_id") or def_vid,
        voice_name=settings_data.get("selected_voice_name") or def_name,
        gender=settings_data.get("selected_voice_gender") or def_gender,
        provider="edge_tts",
        language_code=payload.target_language,
        speed=float(settings_data.get("speech_speed", 1.0)),
        pitch=1.0,
        volume_gain=float(settings_data.get("dubbed_speech_volume", 1.0)),
        replication_enabled=False
    )
    db.add(voice_cfg)
    db.commit()

    return project


@router.get("", response_model=List[ProjectOut])
def list_projects(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List recent dubbing projects."""
    return db.query(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Retrieve full project details, media assets, segments, and job status."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    """Update project metadata or settings."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if payload.name is not None:
        project.name = payload.name
    if payload.source_language is not None:
        project.source_language = payload.source_language
    if payload.target_language is not None:
        project.target_language = payload.target_language
    if payload.settings is not None:
        existing = {}
        try:
            existing = json.loads(project.settings_json or "{}")
        except Exception:
            pass
        existing.update(payload.settings)
        project.settings_json = json.dumps(existing)

    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}/speakers")
def get_project_speakers(project_id: str, db: Session = Depends(get_db)):
    """Returns the detected speakers and their assigned character voices."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    settings_dict = {}
    try:
        settings_dict = json.loads(project.settings_json or "{}")
    except Exception:
        pass

    speaker_map = settings_dict.get("speaker_map") or {}

    # If empty, generate from existing segments
    if not speaker_map:
        from app.db.models import TranscriptSegment
        from app.services.speaker_diarizer import SpeakerDiarizer
        segs = db.query(TranscriptSegment).filter(TranscriptSegment.project_id == project_id).order_by(TranscriptSegment.start_time).all()
        if segs:
            speaker_map = SpeakerDiarizer.assign_character_voices(project.target_language, segs)
            settings_dict["speaker_map"] = speaker_map
            project.settings_json = json.dumps(settings_dict)
            db.commit()

    return {
        "project_id": project_id,
        "dubbing_mode": settings_dict.get("dubbing_mode", "ai_dubbing"),
        "speakers": speaker_map
    }


@router.put("/{project_id}/speakers")
def update_project_speakers(project_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Updates character voice assignments for multi-speaker AI dubbing."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    settings_dict = {}
    try:
        settings_dict = json.loads(project.settings_json or "{}")
    except Exception:
        pass

    current_map = settings_dict.get("speaker_map") or {}
    updated_speakers = payload.get("speakers") if "speakers" in payload else payload
    if isinstance(updated_speakers, dict):
        current_map.update(updated_speakers)
    settings_dict["speaker_map"] = current_map

    if "dubbing_mode" in payload:
        settings_dict["dubbing_mode"] = payload["dubbing_mode"]

    project.settings_json = json.dumps(settings_dict)
    db.commit()

    return {
        "status": "success",
        "dubbing_mode": settings_dict.get("dubbing_mode", "ai_dubbing"),
        "speakers": current_map
    }


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Deletes project record and securely wipes all associated files from disk."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Clean storage
    StorageCleaner.delete_project_storage(project_id)

    db.delete(project)
    db.commit()
    return {"status": "success", "message": "Project and associated files deleted."}


@router.post("/{project_id}/upload")
async def upload_video(
    project_id: str,
    file: UploadFile = File(...),
    x_license_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Secure video upload endpoint:
    - Enforces file extension whitelist
    - Generates randomized internal filename to prevent path traversal
    - Enforces max upload size
    - Probes duration, resolution, codecs via FFprobe / FFmpeg
    """
    access = AccessManager.validate_access(db, x_license_key)
    if not access["allowed"]:
        raise HTTPException(
            status_code=403,
            detail=access.get("message") or "Access Denied: Aap ka access admin ne revoke kar diya hai."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Validate file extension
    orig_name = file.filename or "video.mp4"
    ext = Path(orig_name).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media format '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Secure destination
    internal_key = f"{project_id}_{uuid.uuid4().hex[:10]}{ext}"
    dest_path = settings.UPLOADS_DIR / internal_key

    bytes_written = 0
    try:
        with open(dest_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Uploaded file exceeds maximum allowed limit ({settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB)."
                    )
                buffer.write(chunk)
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    # Inspect media
    try:
        inspector = MediaInspector()
        meta = inspector.inspect(dest_path)
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail=f"Invalid or corrupt media file: {e}")

    if meta.duration <= 0.2:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail="Video duration is zero or undetectable.")

    if meta.duration > settings.MAX_VIDEO_DURATION_SECONDS:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(
            status_code=400,
            detail=f"Video duration ({meta.duration:.1f}s) exceeds maximum allowed duration ({settings.MAX_VIDEO_DURATION_SECONDS}s)."
        )

    # Create MediaAsset record
    asset = MediaAsset(
        project_id=project_id,
        asset_type="ORIGINAL_VIDEO",
        private_storage_key=internal_key,
        original_filename=orig_name,
        file_size=bytes_written,
        mime_type=file.content_type or f"video/{ext.lstrip('.')}",
        duration=meta.duration,
        width=meta.width,
        height=meta.height,
        fps=meta.fps,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    # Link to project
    project.original_asset_id = asset.id
    project.status = "UPLOADED"
    db.commit()

    return {
        "status": "success",
        "asset_id": asset.id,
        "filename": orig_name,
        "duration": meta.duration,
        "width": meta.width,
        "height": meta.height,
        "fps": meta.fps,
        "message": "Video successfully uploaded and inspected."
    }
