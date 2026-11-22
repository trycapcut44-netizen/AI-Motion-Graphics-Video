from typing import Dict, List, Optional
from app.schemas.language import (
    LanguageInfo,
    LanguageCompatibilityResponse,
    PipelineStageStatus,
)

# Comprehensive Language Registry
LANGUAGE_REGISTRY: Dict[str, LanguageInfo] = {
    "auto": LanguageInfo(
        code="auto",
        name="Auto Detect",
        native_name="Auto Detect",
        script="Universal",
        direction="ltr",
        transcription_supported=True,
        translation_supported=False,
        tts_supported=False,
        voice_replication_supported=False,
        subtitles_supported=False,
        providers=["gemini", "whisper"],
        notes="Automatically identifies spoken language during initial audio processing"
    ),
    "en": LanguageInfo(
        code="en",
        name="English",
        native_name="English",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Full pipeline verified with high natural fidelity"
    ),
    "hi": LanguageInfo(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        script="Devanagari",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="High quality neural synthesis in standard and conversational Hindi"
    ),
    "ur": LanguageInfo(
        code="ur",
        name="Urdu",
        native_name="اردو",
        script="Arabic / Nasta'liq",
        direction="rtl",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Right-to-left layout and specialized RTL subtitle encoding"
    ),
    "ar": LanguageInfo(
        code="ar",
        name="Arabic",
        native_name="العربية",
        script="Arabic",
        direction="rtl",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Modern Standard Arabic with bidirectional Unicode subtitle support"
    ),
    "es": LanguageInfo(
        code="es",
        name="Spanish",
        native_name="Español",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Castilian and Latin American varieties supported"
    ),
    "fr": LanguageInfo(
        code="fr",
        name="French",
        native_name="Français",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Metropolitan French neural speech synthesis"
    ),
    "de": LanguageInfo(
        code="de",
        name="German",
        native_name="Deutsch",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Standard High German synthesis"
    ),
    "ja": LanguageInfo(
        code="ja",
        name="Japanese",
        native_name="日本語",
        script="Kanji / Kana",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Full Kanji and Kana script formatting"
    ),
    "zh": LanguageInfo(
        code="zh",
        name="Chinese (Simplified)",
        native_name="简体中文",
        script="Hanzi",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Mandarin Chinese neural synthesis"
    ),
    "pt": LanguageInfo(
        code="pt",
        name="Portuguese",
        native_name="Português",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Brazilian and European Portuguese supported"
    ),
    "ru": LanguageInfo(
        code="ru",
        name="Russian",
        native_name="Русский",
        script="Cyrillic",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Cyrillic script with accurate stress preservation"
    ),
    "it": LanguageInfo(
        code="it",
        name="Italian",
        native_name="Italiano",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Standard Italian neural synthesis"
    ),
    "bn": LanguageInfo(
        code="bn",
        name="Bengali",
        native_name="বাংলা",
        script="Bengali",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Indian and Bangladeshi Bengali"
    ),
    "ta": LanguageInfo(
        code="ta",
        name="Tamil",
        native_name="தமிழ்",
        script="Tamil",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Dravidian script with phonetic alignment"
    ),
    "te": LanguageInfo(
        code="te",
        name="Telugu",
        native_name="తెలుగు",
        script="Telugu",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Telugu neural voice synthesis"
    ),
    "tr": LanguageInfo(
        code="tr",
        name="Turkish",
        native_name="Türkçe",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Agglutinative Turkish neural synthesis"
    ),
    "ko": LanguageInfo(
        code="ko",
        name="Korean",
        native_name="한국어",
        script="Hangul",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=True,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="Hangul script formatting"
    ),
    "fil": LanguageInfo(
        code="fil",
        name="Filipino (Tagalog)",
        native_name="Wikang Filipino",
        script="Latin",
        direction="ltr",
        transcription_supported=True,
        translation_supported=True,
        tts_supported=True,
        voice_replication_supported=False,
        subtitles_supported=True,
        providers=["gemini", "edge_tts"],
        notes="High-quality neural speech synthesis with male and female voices for Filipino (Tagalog)"
    ),
}

LANGUAGE_ALIASES: Dict[str, str] = {
    "tl": "fil",
    "tagalog": "fil",
    "filipino": "fil",
}


def get_all_languages() -> List[LanguageInfo]:
    return list(LANGUAGE_REGISTRY.values())


def get_language(code: str) -> Optional[LanguageInfo]:
    normalized = code.lower().strip()
    resolved = LANGUAGE_ALIASES.get(normalized, normalized)
    return LANGUAGE_REGISTRY.get(resolved)


def validate_language_pair(
    source_lang: str,
    target_lang: str,
    voice_replication_requested: bool = False
) -> LanguageCompatibilityResponse:
    src = get_language(source_lang)
    tgt = get_language(target_lang)
    limitations = []

    if not src:
        limitations.append(f"Source language '{source_lang}' is unrecognized.")
    if not tgt:
        limitations.append(f"Target language '{target_lang}' is unrecognized.")
    if target_lang.lower() == "auto":
        limitations.append("Target language cannot be 'Auto Detect'. Please choose an explicit target language.")

    # Audio extraction
    audio_stage = PipelineStageStatus(
        supported=True,
        provider="FFmpeg 7.1",
        message="Full multi-channel audio stream extraction and resample supported."
    )

    # Transcription
    trans_supported = src.transcription_supported if src else False
    trans_stage = PipelineStageStatus(
        supported=trans_supported,
        provider="Gemini Multimodal Speech",
        message="Supported with timestamp extraction." if trans_supported else "Language not supported for transcription."
    )

    # Translation
    trans_tgt_supported = tgt.translation_supported if tgt else False
    trans_text_stage = PipelineStageStatus(
        supported=trans_tgt_supported,
        provider="Gemini Translation Engine",
        message="Context-aware natural translation supported." if trans_tgt_supported else "Translation unavailable."
    )

    # Speech generation
    tts_supported = tgt.tts_supported if tgt else False
    tts_stage = PipelineStageStatus(
        supported=tts_supported,
        provider="Edge Neural / Gemini TTS",
        message=f"Neural speech models available for {tgt.name if tgt else target_lang}." if tts_supported else "Speech synthesis unavailable."
    )

    # Voice replication
    replication_supported = tgt.voice_replication_supported if tgt else False
    if voice_replication_requested and not replication_supported:
        limitations.append(
            f"Consent-based voice replication is currently restricted for {tgt.name if tgt else target_lang}. Falling back to standard neural voice."
        )
    voice_rep_stage = PipelineStageStatus(
        supported=replication_supported,
        provider="Gemini Voices API (v1beta)",
        message="Requires 2-part consent recording and voice matching." if replication_supported else "Not currently verified for this language."
    )

    # Subtitles
    subtitles_supported = tgt.subtitles_supported if tgt else False
    sub_stage = PipelineStageStatus(
        supported=subtitles_supported,
        provider="Subtitle Engine",
        message=f"SRT and WebVTT with {'RTL markers' if (tgt and tgt.direction == 'rtl') else 'standard Unicode'} supported."
    )

    overall_compatible = bool(
        src and tgt and
        target_lang.lower() != "auto" and
        trans_supported and
        trans_tgt_supported and
        tts_supported
    )

    return LanguageCompatibilityResponse(
        source_language=source_lang,
        target_language=target_lang,
        is_compatible=overall_compatible,
        audio_extraction=audio_stage,
        transcription=trans_stage,
        translation=trans_text_stage,
        speech_generation=tts_stage,
        voice_replication=voice_rep_stage,
        subtitles=sub_stage,
        limitations=limitations,
    )
