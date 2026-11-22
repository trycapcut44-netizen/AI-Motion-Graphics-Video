from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pathlib import Path
from pydantic import BaseModel


class RawTranscriptSegment(BaseModel):
    speaker_id: str = "Speaker 1"
    speaker_gender: str = "male"
    emotion: Optional[str] = "neutral"
    start_time: float
    end_time: float
    text: str


class BaseTranscriptionProvider(ABC):
    @abstractmethod
    async def transcribe(
        self,
        audio_path: Path,
        source_language: Optional[str] = "auto"
    ) -> List[RawTranscriptSegment]:
        """Transcribe an audio file into timestamped segments."""
        pass


class BaseTranslationProvider(ABC):
    @abstractmethod
    async def translate(
        self,
        segments: List[RawTranscriptSegment],
        source_language: str,
        target_language: str,
        style: str = "natural"
    ) -> List[str]:
        """Translate a sequence of text segments maintaining conversational context."""
        pass


class BaseTTSProvider(ABC):
    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice_id: str,
        language_code: str,
        speed: float = 1.0,
        pitch: float = 1.0,
        output_path: Optional[Path] = None
    ) -> Path:
        """Synthesize text into speech and return the local audio file path."""
        pass


class BaseVoiceReplicationProvider(ABC):
    @abstractmethod
    async def register_replicated_voice(
        self,
        name: str,
        reference_audio_path: Path,
        consent_audio_path: Path,
        consent_statement: str,
        language_code: str
    ) -> Dict[str, Any]:
        """Verify consent and enroll a replicated voice profile."""
        pass

    @abstractmethod
    async def revoke_voice(self, voice_id: str) -> bool:
        """Delete an enrolled replicated voice."""
        pass
