import pytest
from pathlib import Path
from app.db.models import TranscriptSegment
from app.services.subtitle_generator import SubtitleGenerator
from app.config import settings


def test_srt_generation(tmp_path):
    seg1 = TranscriptSegment(
        id="seg-1",
        project_id="test-proj",
        speaker_id="Speaker 1",
        start_time=1.25,
        end_time=4.50,
        source_text="Hello world",
        translated_text="नमस्ते दुनिया",  # Hindi Devanagari
    )
    seg2 = TranscriptSegment(
        id="seg-2",
        project_id="test-proj",
        speaker_id="Speaker 2",
        start_time=5.00,
        end_time=7.82,
        source_text="Welcome to the video",
        translated_text="वीडियो में आपका स्वागत है",
    )

    srt_file = tmp_path / "test.srt"
    SubtitleGenerator.generate_srt([seg1, seg2], srt_file, language_code="hi")

    content = srt_file.read_text(encoding="utf-8")
    assert "00:00:01,250 --> 00:00:04,500" in content
    assert "00:00:05,000 --> 00:00:07,820" in content
    assert "नमस्ते दुनिया" in content
    assert "वीडियो में आपका स्वागत है" in content


def test_rtl_subtitles_urdu(tmp_path):
    seg = TranscriptSegment(
        id="seg-ur",
        project_id="test-proj-ur",
        speaker_id="Speaker 1",
        start_time=0.5,
        end_time=3.0,
        source_text="Thank you very much",
        translated_text="آپ کا بہت بہت شکریہ",  # Urdu
    )

    srt_file = tmp_path / "urdu.srt"
    SubtitleGenerator.generate_srt([seg], srt_file, language_code="ur")

    content = srt_file.read_text(encoding="utf-8")
    # Should contain right-to-left embedding marker \u202B
    assert "\u202B" in content
    assert "آپ کا بہت بہت شکریہ" in content


def test_vtt_generation(tmp_path):
    seg = TranscriptSegment(
        id="seg-vtt",
        project_id="test-proj",
        speaker_id="Speaker 1",
        start_time=1.0,
        end_time=2.5,
        source_text="Test",
        translated_text="Test Translation",
    )
    vtt_file = tmp_path / "test.vtt"
    SubtitleGenerator.generate_vtt([seg], vtt_file, language_code="en")

    content = vtt_file.read_text(encoding="utf-8")
    assert content.startswith("WEBVTT")
    assert "00:00:01.000 --> 00:00:02.500" in content
