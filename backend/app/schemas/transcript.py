from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TranscriptSegmentBase(BaseModel):
    speaker_id: str = "Speaker 1"
    speaker_gender: Optional[str] = "male"
    voice_id: Optional[str] = None
    start_time: float
    end_time: float
    source_text: str
    translated_text: Optional[str] = None
    is_approved: bool = True


class TranscriptSegmentCreate(TranscriptSegmentBase):
    pass


class TranscriptSegmentUpdate(BaseModel):
    translated_text: Optional[str] = None
    source_text: Optional[str] = None
    speaker_id: Optional[str] = None
    speaker_gender: Optional[str] = None
    voice_id: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    is_approved: Optional[bool] = None


class TranscriptSegmentOut(TranscriptSegmentBase):
    id: str
    project_id: str
    audio_asset_id: Optional[str] = None
    edit_version: int = 1

    model_config = ConfigDict(from_attributes=True)


class BulkTranscriptUpdate(BaseModel):
    segments: List[TranscriptSegmentOut]
