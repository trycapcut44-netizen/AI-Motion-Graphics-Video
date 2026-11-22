from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ProcessingJob
from app.schemas.job import ProcessingJobOut
from app.workers.queue import job_queue
from app.workers.pipeline import run_transcription_pipeline, run_dubbing_pipeline

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=ProcessingJobOut)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Retrieve real-time processing status, progress percentage, and current stage."""
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """Cancel an ongoing background processing job."""
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    cancelled = job_queue.cancel_job(job_id)
    if not cancelled:
        if job.status == "RUNNING" or job.status == "QUEUED":
            job.status = "CANCELLED"
            job.stage = "CANCELLED"
            job.message = "Job cancelled."
            db.commit()

    return {"status": "success", "message": "Job cancellation requested."}


@router.post("/{job_id}/retry")
def retry_job(job_id: str, db: Session = Depends(get_db)):
    """Retry a failed or interrupted job."""
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.status not in ["FAILED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Only failed or cancelled jobs can be retried.")

    job.status = "QUEUED"
    job.progress = 0
    job.retry_count += 1
    job.message = f"Retrying job (attempt #{job.retry_count})..."
    job.error_code = None
    job.error_details = None
    db.commit()

    # Determine pipeline function based on prior stage
    if job.stage in ["EXTRACTING_AUDIO", "TRANSCRIBING", "TRANSLATING"]:
        job_queue.enqueue_job(job.id, run_transcription_pipeline, project_id=job.project_id)
    else:
        job_queue.enqueue_job(job.id, run_dubbing_pipeline, project_id=job.project_id)

    return {"status": "success", "message": "Job retry initiated."}
