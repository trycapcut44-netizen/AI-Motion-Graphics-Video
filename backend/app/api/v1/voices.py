from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.db.models import VoiceConfiguration, ConsentRecord, Project
from app.schemas.voice import VoiceOption, VoiceConfigUpdate, ConsentRequest
from app.registry.voices import get_voices_for_language

router = APIRouter(prefix="/voices", tags=["Voices"])

PREVIEW_SAMPLES = {
    "en": "Hello, this is a sample of this neural voice.",
    "hi": "नमस्ते, यह इस आवाज़ का एक नमूना है।",
    "ur": "السلام علیکم، یہ اس آواز کا ایک نمونہ ہے۔",
    "ar": "مرحبًا، هذا نموذج تجريبي لهذا الصوت.",
    "es": "Hola, este es un ejemplo de esta voz.",
    "fr": "Bonjour, ceci est un extrait de cette voix.",
    "de": "Hallo, dies ist eine Hörprobe dieser Stimme.",
}


@router.get("", response_model=List[VoiceOption])
def list_voices(language_code: str = "hi"):
    """Returns verified neural voices compatible with the specified target language."""
    return get_voices_for_language(language_code)


@router.get("/{voice_id}/preview")
async def preview_voice(voice_id: str, language_code: str = "en"):
    """Generates and streams an instant 2-3s audio preview of the selected voice."""
    preview_file = settings.TEMP_DIR / f"preview_{voice_id}.mp3"
    if not preview_file.exists() or preview_file.stat().st_size == 0:
        sample_text = PREVIEW_SAMPLES.get(language_code, PREVIEW_SAMPLES.get("en", "Hello, this is a sample of this voice."))
        try:
            from app.providers.factory import ProviderFactory
            tts = ProviderFactory.get_tts_provider("edge_tts")
            await tts.synthesize(
                text=sample_text,
                voice_id=voice_id,
                language_code=language_code,
                output_path=preview_file
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate voice preview: {e}")

    return FileResponse(
        preview_file,
        media_type="audio/mpeg",
        filename=f"{voice_id}_preview.mp3"
    )


@router.get("/projects/{project_id}/configuration")
def get_project_voice(project_id: str, db: Session = Depends(get_db)):
    """Retrieves current voice configuration for a project."""
    voice_cfg = db.query(VoiceConfiguration).filter(VoiceConfiguration.project_id == project_id).first()
    if not voice_cfg:
        return {"voice_id": None}
    return {
        "voice_id": voice_cfg.voice_id,
        "voice_name": voice_cfg.voice_name,
        "gender": voice_cfg.gender,
        "provider": voice_cfg.provider,
        "language_code": voice_cfg.language_code,
        "speed": voice_cfg.speed,
        "pitch": voice_cfg.pitch,
        "volume_gain": voice_cfg.volume_gain
    }


@router.post("/projects/{project_id}/configure")
def configure_project_voice(
    project_id: str,
    payload: VoiceConfigUpdate,
    db: Session = Depends(get_db)
):
    """Assigns voice configuration to a dubbing project."""
    import json
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    voice_cfg = db.query(VoiceConfiguration).filter(VoiceConfiguration.project_id == project_id).first()
    if not voice_cfg:
        voice_cfg = VoiceConfiguration(
            project_id=project_id,
            voice_id=payload.voice_id,
            voice_name=payload.voice_name,
            gender=payload.gender,
            provider=payload.provider,
            language_code=payload.language_code,
            speed=payload.speed,
            pitch=payload.pitch,
            volume_gain=payload.volume_gain,
            replication_enabled=payload.replication_enabled
        )
        db.add(voice_cfg)
    else:
        voice_cfg.voice_id = payload.voice_id
        if payload.voice_name:
            voice_cfg.voice_name = payload.voice_name
        if payload.gender:
            voice_cfg.gender = payload.gender
        voice_cfg.provider = payload.provider
        voice_cfg.language_code = payload.language_code
        voice_cfg.speed = payload.speed
        voice_cfg.pitch = payload.pitch
        voice_cfg.volume_gain = payload.volume_gain
        voice_cfg.replication_enabled = payload.replication_enabled

    # Keep project settings_json in sync
    try:
        settings_data = json.loads(project.settings_json or "{}")
        settings_data["selected_voice_id"] = payload.voice_id
        if payload.voice_name:
            settings_data["selected_voice_name"] = payload.voice_name
        if payload.gender:
            settings_data["selected_voice_gender"] = payload.gender
        project.settings_json = json.dumps(settings_data)
    except Exception:
        pass

    db.commit()
    return {"status": "success", "message": "Voice configuration updated."}


@router.post("/projects/{project_id}/consent")
def submit_voice_consent(
    project_id: str,
    payload: ConsentRequest,
    db: Session = Depends(get_db)
):
    """
    Records legally required explicit consent for original speaker voice replication.
    Enforces that permission is explicitly affirmed.
    """
    if not payload.has_explicit_permission:
        raise HTTPException(
            status_code=400,
            detail="Explicit permission affirmation is mandatory before enabling voice replication."
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    record = db.query(ConsentRecord).filter(ConsentRecord.project_id == project_id).first()
    if not record:
        record = ConsentRecord(
            project_id=project_id,
            speaker_name=payload.speaker_name,
            consent_statement=payload.consent_statement,
            consent_status="GRANTED"
        )
        db.add(record)
    else:
        record.speaker_name = payload.speaker_name
        record.consent_statement = payload.consent_statement
        record.consent_status = "GRANTED"

    db.commit()
    return {
        "status": "success",
        "consent_id": record.id,
        "message": "Consent recorded with legal timestamp."
    }
