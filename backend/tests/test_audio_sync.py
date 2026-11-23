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


def test_lip_sync_zero_drift_and_tempo_fit(tmp_path):
    sync = SpeechSynchronizer()
    # Create synthetic speech clip (2.5s)
    clip_long = tmp_path / "long_speech.wav"
    sync.generate_silence(2.5, clip_long)

    # Fit into 1.5s window
    fitted_wav = tmp_path / "fitted.wav"
    fitted_dur = sync.fit_segment_audio(
        clip_long,
        start_time=1.0,
        end_time=2.5,
        output_path=fitted_wav,
        max_duration=1.6
    )

    assert fitted_wav.exists()
    assert fitted_dur <= 1.65  # Fits within the allowed window

    # Multi-segment timeline with silence gap
    clip2 = tmp_path / "clip2.wav"
    sync.generate_silence(1.0, clip2)

    segments = [
        (2.0, 3.5, clip_long),  # Starts at 2.0s
        (5.0, 6.0, clip2)       # Starts at 5.0s
    ]
    final_out = tmp_path / "zero_drift_timeline.wav"
    sync.assemble_timeline(segments, 8.0, final_out)

    assert final_out.exists()
    total_measured = sync.measure_audio_duration(final_out)
    assert abs(total_measured - 8.0) < 0.35
