from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.media import MediaAssetOut
from app.schemas.transcript import TranscriptSegmentOut
from app.schemas.job import ProcessingJobOut


class ProjectSettings(BaseModel):
    dubbing_mode: str = "ai_dubbing"  # "voice_over" (Single Narrator) or "ai_dubbing" (Multi-Speaker Dialogue Dubbing)
    background_audio_enabled: bool = False
    original_audio_volume: float = 0.0  # ducked volume for original speech/background
    dubbed_speech_volume: float = 1.0
    speech_speed: float = 1.0
    subtitles_enabled: bool = True
    burn_subtitles: bool = False
    translation_style: str = "natural"  # "natural", "conversational", "formal"
    selected_voice_id: Optional[str] = None
    selected_voice_name: Optional[str] = None
    selected_voice_gender: Optional[str] = None
    selected_voice_provider: str = "edge_tts"
    replication_enabled: bool = False
    speaker_map: Optional[Dict[str, Any]] = None


class ProjectCreate(BaseModel):
    name: str = "Untitled Dubbing Project"
    source_language: str = "auto"
    target_language: str = "hi"
    owner_id: Optional[str] = None
    settings: Optional[ProjectSettings] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    owner_id: Optional[str]
    source_language: str
    target_language: str
    status: str
    original_asset_id: Optional[str] = None
    output_asset_id: Optional[str] = None
    settings_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    # Associated items
    assets: List[MediaAssetOut] = []
    segments: List[TranscriptSegmentOut] = []
    jobs: List[ProcessingJobOut] = []

    model_config = ConfigDict(from_attributes=True)
