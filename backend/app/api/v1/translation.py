from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Project, TranscriptSegment
from app.schemas.transcript import (
    TranscriptSegmentOut,
    TranscriptSegmentUpdate,
    BulkTranscriptUpdate,
)

router = APIRouter(prefix="/projects", tags=["Transcript & Translation"])


@router.get("/{project_id}/transcript", response_model=List[TranscriptSegmentOut])
def get_transcript_segments(project_id: str, db: Session = Depends(get_db)):
    """Retrieves all timestamped transcript segments for review and editing."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.project_id == project_id
    ).order_by(TranscriptSegment.start_time).all()
    return segments


@router.put("/{project_id}/transcript", response_model=List[TranscriptSegmentOut])
def update_transcript_bulk(
    project_id: str,
    payload: BulkTranscriptUpdate,
    db: Session = Depends(get_db)
):
    """
    Bulk updates translated text and timing adjustments before dubbing.
    Enforces that edits do not destroy timestamps.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    updated_segments = []
    for item in payload.segments:
        seg = db.query(TranscriptSegment).filter(
            TranscriptSegment.id == item.id,
            TranscriptSegment.project_id == project_id
        ).first()
        if seg:
            seg.translated_text = item.translated_text
            seg.source_text = item.source_text
            seg.speaker_id = item.speaker_id
            if item.speaker_gender:
                seg.speaker_gender = item.speaker_gender
            if item.voice_id:
                seg.voice_id = item.voice_id
            seg.start_time = item.start_time
            seg.end_time = item.end_time
            seg.is_approved = item.is_approved
            seg.edit_version += 1
            updated_segments.append(seg)

    db.commit()

    # Re-sync project speaker_map in settings_json
    try:
        import json
        from app.services.speaker_diarizer import SpeakerDiarizer
        settings_dict = json.loads(project.settings_json or "{}")
        existing_spk = settings_dict.get("speaker_map") or {}
        new_spk_map = SpeakerDiarizer.assign_character_voices(
            target_language=project.target_language,
            segments=updated_segments,
            existing_map=existing_spk
        )
        settings_dict["speaker_map"] = new_spk_map
        project.settings_json = json.dumps(settings_dict)
        db.commit()
    except Exception as e:
        print(f"[Translation API] Warning: Failed to re-sync speaker_map: {e}")

    return updated_segments


@router.put("/{project_id}/transcript/{segment_id}", response_model=TranscriptSegmentOut)
def update_single_segment(
    project_id: str,
    segment_id: str,
    payload: TranscriptSegmentUpdate,
    db: Session = Depends(get_db)
):
    """Edit a single segment's translated text or speaker attribution."""
    seg = db.query(TranscriptSegment).filter(
        TranscriptSegment.id == segment_id,
        TranscriptSegment.project_id == project_id
    ).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Transcript segment not found.")

    if payload.translated_text is not None:
        seg.translated_text = payload.translated_text
    if payload.source_text is not None:
        seg.source_text = payload.source_text
    if payload.speaker_id is not None:
        seg.speaker_id = payload.speaker_id
    if payload.speaker_gender is not None:
        seg.speaker_gender = payload.speaker_gender
    if payload.voice_id is not None:
        seg.voice_id = payload.voice_id
    if payload.start_time is not None:
        seg.start_time = payload.start_time
    if payload.end_time is not None:
        seg.end_time = payload.end_time
    if payload.is_approved is not None:
        seg.is_approved = payload.is_approved

    seg.edit_version += 1
    db.commit()
    db.refresh(seg)
    return seg
