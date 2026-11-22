from fastapi import APIRouter
from typing import List
from app.schemas.language import (
    LanguageInfo,
    LanguageCompatibilityRequest,
    LanguageCompatibilityResponse,
)
from app.registry.languages import get_all_languages, validate_language_pair

router = APIRouter(prefix="/languages", tags=["Languages"])


@router.get("", response_model=List[LanguageInfo])
def list_languages():
    """Returns all supported languages and their capabilities."""
    return get_all_languages()


@router.post("/compatibility", response_model=LanguageCompatibilityResponse)
def check_compatibility(payload: LanguageCompatibilityRequest):
    """
    Validates end-to-end pipeline compatibility for a source and target language pair.
    """
    return validate_language_pair(
        source_lang=payload.source_language,
        target_lang=payload.target_language,
        voice_replication_requested=payload.voice_replication_requested
    )
