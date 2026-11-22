from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Project, ProcessingJob
from app.workers.queue import job_queue
from app.workers.pipeline import run_transcription_pipeline
from app.services.access_manager import AccessManager

router = APIRouter(prefix="/projects", tags=["Transcription"])


@router.post("/{project_id}/transcription")
async def start_transcription(
    project_id: str,
    x_license_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Initiates speech extraction, transcription, and translation pipeline
    as an asynchronous background job.
    """
    access = AccessManager.validate_access(db, x_license_key)
    if not access["allowed"]:
        raise HTTPException(
            status_code=403,
            detail=access.get("message") or "Access Denied: Aap ka access admin ne revoke kar diya hai."
        )

    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        if not project.original_asset_id:
            raise HTTPException(status_code=400, detail="Cannot transcribe: No video uploaded yet.")

        # Create job record
        job = ProcessingJob(
            project_id=project_id,
            stage="QUEUED",
            status="QUEUED",
            progress=0,
            message="Job queued for audio extraction and transcription..."
        )
        db.add(job)
        project.status = "TRANSCRIBING"
        db.commit()
        db.refresh(job)

        # Enqueue background task
        job_queue.enqueue_job(job.id, run_transcription_pipeline, project_id=project_id)

        return {
            "status": "success",
            "job_id": job.id,
            "message": "Transcription job queued successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue transcription job: {str(e)}"
        )
