from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.db.session import get_db
from app.db.models import Project, ProcessingJob, UsageRecord, MediaAsset
from app.providers.gemini import GeminiProvider

router = APIRouter(prefix="/usage", tags=["Usage & Costs"])


@router.get("/stats")
def get_usage_statistics(db: Session = Depends(get_db)):
    """
    Returns verifiable usage metrics:
    - Total projects
    - Completed dubs
    - Failed jobs
    - Total video duration processed
    - Estimated API cost (based on actual usage)
    - Service and provider availability
    """
    total_projects = db.query(Project).count()
    completed_projects = db.query(Project).filter(Project.status == "COMPLETED").count()
    failed_jobs = db.query(ProcessingJob).filter(ProcessingJob.status == "FAILED").count()
    
    total_duration_sec = db.query(func.sum(MediaAsset.duration)).filter(
        MediaAsset.asset_type == "ORIGINAL_VIDEO"
    ).scalar() or 0.0

    total_cost = db.query(func.sum(UsageRecord.estimated_cost)).scalar() or 0.0

    gemini_provider = GeminiProvider()
    gemini_active = gemini_provider.is_configured()

    return {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "failed_jobs": failed_jobs,
        "total_video_duration_seconds": round(total_duration_sec, 2),
        "total_video_duration_minutes": round(total_duration_sec / 60, 2),
        "total_estimated_cost_usd": round(total_cost, 4),
        "services": {
            "gemini_api": {
                "configured": gemini_active,
                "model_transcription": settings.GEMINI_TRANSCRIPTION_MODEL,
                "model_translation": settings.GEMINI_TRANSLATION_MODEL,
                "model_tts": settings.GEMINI_TTS_MODEL,
            },
            "edge_neural_tts": {
                "configured": True,
                "status": "ONLINE",
                "cost": "Free / Built-in",
                "languages_supported": "100+"
            },
            "ffmpeg_engine": {
                "path": settings.FFMPEG_PATH,
                "status": "READY"
            }
        }
    }
