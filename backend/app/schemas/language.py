from typing import List, Optional
from pydantic import BaseModel


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    script: str  # Latin, Devanagari, Arabic, Han, etc.
    direction: str  # "ltr" or "rtl"
    transcription_supported: bool
    translation_supported: bool
    tts_supported: bool
    voice_replication_supported: bool
    subtitles_supported: bool
    providers: List[str]
    notes: Optional[str] = None


class LanguageCompatibilityRequest(BaseModel):
    source_language: str
    target_language: str
    voice_replication_requested: bool = False


class PipelineStageStatus(BaseModel):
    supported: bool
    provider: str
    message: str


class LanguageCompatibilityResponse(BaseModel):
    source_language: str
    target_language: str
    is_compatible: bool
    audio_extraction: PipelineStageStatus
    transcription: PipelineStageStatus
    translation: PipelineStageStatus
    speech_generation: PipelineStageStatus
    voice_replication: PipelineStageStatus
    subtitles: PipelineStageStatus
    limitations: List[str] = []
