from typing import Optional, List
from pydantic import BaseModel


class VoiceOption(BaseModel):
    voice_id: str
    name: str
    provider: str  # "edge_tts", "gemini_tts", "gemini_replicated"
    language_code: str
    gender: str  # "male", "female", "neutral"
    sample_url: Optional[str] = None
    description: Optional[str] = None
    supports_cloning: bool = False


class VoiceConfigUpdate(BaseModel):
    voice_id: str
    voice_name: Optional[str] = None
    gender: Optional[str] = None
    provider: str = "edge_tts"
    language_code: str
    speed: float = 1.0
    pitch: float = 1.0
    volume_gain: float = 1.0
    replication_enabled: bool = False


class ConsentRequest(BaseModel):
    speaker_name: str
    consent_statement: str
    has_explicit_permission: bool
