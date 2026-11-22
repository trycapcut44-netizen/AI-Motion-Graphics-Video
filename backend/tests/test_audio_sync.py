import pytest
from pathlib import Path
from app.services.speech_sync import SpeechSynchronizer


def test_silence_generation(tmp_path):
    sync = SpeechSynchronizer()
    silence_wav = tmp_path / "silence_test.wav"
    sync.generate_silence(2.5, silence_wav)

    assert silence_wav.exists()
    duration = sync.measure_audio_duration(silence_wav)
    assert abs(duration - 2.5) < 0.2


def test_timeline_assembly(tmp_path):
    sync = SpeechSynchronizer()
    # Create two synthetic audio clips
    clip1 = tmp_path / "clip1.wav"
    clip2 = tmp_path / "clip2.wav"
    sync.generate_silence(1.5, clip1)
    sync.generate_silence(1.0, clip2)

    segments = [
        (0.5, 2.0, clip1),
        (3.0, 4.0, clip2)
    ]
    total_dur = 5.0
    final_wav = tmp_path / "assembled_timeline.wav"

    sync.assemble_timeline(segments, total_dur, final_wav)
    assert final_wav.exists()
    final_dur = sync.measure_audio_duration(final_wav)
    assert abs(final_dur - total_dur) < 0.3
