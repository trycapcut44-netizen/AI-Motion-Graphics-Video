from typing import Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.db.models import Project, MediaAsset, TranscriptSegment
from app.services.subtitle_generator import SubtitleGenerator
from app.services.access_manager import AccessManager

router = APIRouter(prefix="/projects", tags=["Downloads & Media Stream"])


@router.get("/{project_id}/downloads/{asset_type}")
def download_asset(
    project_id: str,
    asset_type: str,
    x_license_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Secure file download endpoint:
    Supports asset_type:
    - 'video' or 'rendered': Final dubbed MP4
    - 'source_video': Original uploaded video
    - 'subtitles_srt': Target language SRT
    - 'subtitles_vtt': Target language WebVTT
    - 'transcript_txt': Target language transcript TXT
    - 'source_transcript_txt': Original English/source transcript TXT
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

    if asset_type in ["video", "rendered"]:
        asset = db.query(MediaAsset).filter(
            MediaAsset.project_id == project_id,
            MediaAsset.asset_type == "RENDERED_VIDEO"
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Rendered video not available yet.")
        file_path = settings.PROCESSED_DIR / asset.private_storage_key
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Rendered video file missing on disk.")
        return FileResponse(
            path=str(file_path),
            media_type="video/mp4",
            filename=f"{project.name}_dubbed_{project.target_language}.mp4"
        )

    elif asset_type == "source_video":
        asset = db.query(MediaAsset).filter(
            MediaAsset.id == project.original_asset_id
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Source video asset not found.")
        file_path = settings.UPLOADS_DIR / asset.private_storage_key
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Source video file missing on disk.")
        return FileResponse(
            path=str(file_path),
            media_type=asset.mime_type or "video/mp4",
            filename=asset.original_filename or "source_video.mp4"
        )

    elif asset_type == "subtitles_srt":
        asset = db.query(MediaAsset).filter(
            MediaAsset.project_id == project_id,
            MediaAsset.asset_type == "SUBTITLE_SRT"
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail="SRT subtitles not generated yet.")
        file_path = settings.PROCESSED_DIR / asset.private_storage_key
        return FileResponse(
            path=str(file_path),
            media_type="application/x-subrip",
            filename=f"{project.name}_{project.target_language}.srt"
        )

    elif asset_type == "subtitles_vtt":
        asset = db.query(MediaAsset).filter(
            MediaAsset.project_id == project_id,
            MediaAsset.asset_type == "SUBTITLE_VTT"
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail="WebVTT subtitles not generated yet.")
        file_path = settings.PROCESSED_DIR / asset.private_storage_key
        return FileResponse(
            path=str(file_path),
            media_type="text/vtt",
            filename=f"{project.name}_{project.target_language}.vtt"
        )

    elif asset_type in ["transcript_txt", "source_transcript_txt"]:
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.project_id == project_id
        ).order_by(TranscriptSegment.start_time).all()
        if not segments:
            raise HTTPException(status_code=404, detail="No transcript segments found.")
        
        is_target = (asset_type == "transcript_txt")
        tmp_path = settings.TEMP_DIR / f"{project_id}_{asset_type}.txt"
        SubtitleGenerator.generate_txt(segments, tmp_path, use_translation=is_target)
        return FileResponse(
            path=str(tmp_path),
            media_type="text/plain; charset=utf-8",
            filename=f"{project.name}_{'target' if is_target else 'source'}_transcript.txt"
        )

    raise HTTPException(status_code=400, detail=f"Unsupported asset download type: '{asset_type}'")
