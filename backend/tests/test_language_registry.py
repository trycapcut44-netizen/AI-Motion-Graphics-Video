import pytest
from app.registry.languages import get_all_languages, get_language, validate_language_pair
from app.registry.voices import get_voices_for_language


def test_registry_contains_major_languages():
    langs = get_all_languages()
    codes = [l.code for l in langs]
    assert "en" in codes
    assert "hi" in codes
    assert "ur" in codes
    assert "ar" in codes
    assert "es" in codes
    assert "fr" in codes
    assert "de" in codes
    assert "ja" in codes
    assert "zh" in codes


def test_rtl_detection():
    ur = get_language("ur")
    assert ur is not None
    assert ur.direction == "rtl"

    ar = get_language("ar")
    assert ar is not None
    assert ar.direction == "rtl"

    hi = get_language("hi")
    assert hi is not None
    assert hi.direction == "ltr"


def test_compatibility_pairs():
    # English to Hindi
    res_hi = validate_language_pair("en", "hi")
    assert res_hi.is_compatible is True
    assert res_hi.speech_generation.supported is True

    # English to Urdu (RTL)
    res_ur = validate_language_pair("en", "ur")
    assert res_ur.is_compatible is True
    assert res_ur.subtitles.supported is True

    # English to Arabic (RTL)
    res_ar = validate_language_pair("en", "ar")
    assert res_ar.is_compatible is True

    # Urdu to English
    res_ur_en = validate_language_pair("ur", "en")
    assert res_ur_en.is_compatible is True


def test_invalid_target_auto():
    # Target language cannot be "auto"
    res = validate_language_pair("en", "auto")
    assert res.is_compatible is False
    assert any("Auto Detect" in lim for lim in res.limitations)


def test_voice_catalog_filtering():
    hi_voices = get_voices_for_language("hi")
    assert len(hi_voices) >= 2
    genders = {v.gender for v in hi_voices}
    assert "female" in genders
    assert "male" in genders

    ur_voices = get_voices_for_language("ur")
    assert len(ur_voices) >= 2


def test_filipino_language_support():
    fil = get_language("fil")
    assert fil is not None
    assert fil.name == "Filipino (Tagalog)"
    assert fil.direction == "ltr"
    assert fil.transcription_supported is True
    assert fil.translation_supported is True
    assert fil.tts_supported is True

    # Test alias support (tl / tagalog / filipino)
    tl = get_language("tl")
    assert tl is not None
    assert tl.code == "fil"

    tagalog = get_language("tagalog")
    assert tagalog is not None
    assert tagalog.code == "fil"

    # Test compatibility pair
    compat = validate_language_pair("en", "fil")
    assert compat.is_compatible is True
    assert compat.speech_generation.supported is True

    # Test voices: both male and female must exist for multi-character dubbing
    voices = get_voices_for_language("fil")
    assert len(voices) >= 2
    genders = {v.gender for v in voices}
    assert "male" in genders
    assert "female" in genders

    # Test alias in voices
    tl_voices = get_voices_for_language("tl")
    assert len(tl_voices) >= 2
