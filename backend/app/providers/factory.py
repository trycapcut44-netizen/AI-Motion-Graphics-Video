from typing import Optional
from app.config import settings
from app.providers.base import (
    BaseTranscriptionProvider,
    BaseTranslationProvider,
    BaseTTSProvider,
    BaseVoiceReplicationProvider,
)
from app.providers.gemini import GeminiProvider
from app.providers.edge_tts_adapter import EdgeTTSProvider


class ProviderFactory:
    @staticmethod
    def get_transcription_provider() -> BaseTranscriptionProvider:
        gemini = GeminiProvider()
        return gemini

    @staticmethod
    def get_translation_provider() -> BaseTranslationProvider:
        gemini = GeminiProvider()
        return gemini

    @staticmethod
    def get_tts_provider(provider_name: str = "edge_tts") -> BaseTTSProvider:
        if provider_name == "gemini_tts":
            return GeminiProvider()
        return EdgeTTSProvider()

    @staticmethod
    def get_voice_replication_provider() -> BaseVoiceReplicationProvider:
        return GeminiProvider()
