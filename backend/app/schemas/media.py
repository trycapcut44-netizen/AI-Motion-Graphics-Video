from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MediaMetadata(BaseModel):
    duration: float
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    audio_channels: Optional[int] = None
    sample_rate: Optional[int] = None
    bitrate: Optional[int] = None
    format_name: Optional[str] = None


class MediaAssetOut(BaseModel):
    id: str
    project_id: str
    asset_type: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
