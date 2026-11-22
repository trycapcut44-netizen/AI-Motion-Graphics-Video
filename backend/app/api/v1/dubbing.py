from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Project, ProcessingJob, TranscriptSegment
from app.workers.queue import job_queue
from app.workers.pipeline import run_dubbing_pipeline
from app.services.access_manager import AccessManager

router = APIRouter(prefix="/projects", tags=["Dubbing"])


@router.post("/{project_id}/dub")
async def start_dubbing(
    project_id: str,
    x_license_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Triggers speech synthesis, tempo alignment, audio mixing, and MP4 rendering
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

        # Real-time Access Control Enforcement
        if project.owner_id:
            from app.db.models import User
            import json
            user = db.query(User).filter(User.id == project.owner_id).first()
            if user:
                if not user.is_active or user.status == "suspended":
                    raise HTTPException(
                        status_code=403,
                        detail="Access Denied: Aap ka account admin ki taraf se suspend kar diya gaya hai. Barah-e-karam admin se rabta karein."
                    )
                settings_dict = json.loads(project.settings_json or "{}")
                mode = settings_dict.get("dubbing_mode", "ai_dubbing")
                if mode == "ai_dubbing" and not user.can_ai_dubbing:
                    raise HTTPException(
                        status_code=403,
                        detail="Access Denied: Admin ne aap ke account ke liye AI Dubbing feature disable kiya hua hai."
                    )
                if mode == "voice_over" and not user.can_voice_over:
                    raise HTTPException(
                        status_code=403,
                        detail="Access Denied: Admin ne aap ke account ke liye Voice Over feature disable kiya hua hai."
                    )

        segments_count = db.query(TranscriptSegment).filter(
            TranscriptSegment.project_id == project_id,
            TranscriptSegment.is_approved == True
        ).count()

        if segments_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot start dubbing: No approved transcript segments found. Run transcription first."
            )

        # Create job record
        job = ProcessingJob(
            project_id=project_id,
            stage="QUEUED",
            status="QUEUED",
            progress=0,
            message="Queued for target-language speech generation and synchronization..."
        )
        db.add(job)
        project.status = "DUBBING"
        db.commit()
        db.refresh(job)

        # Enqueue background task
        job_queue.enqueue_job(job.id, run_dubbing_pipeline, project_id=project_id)

        return {
            "status": "success",
            "job_id": job.id,
            "message": "Dubbing and rendering pipeline queued successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue dubbing job: {str(e)}"
        )
