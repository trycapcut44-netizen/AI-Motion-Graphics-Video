import pytest
from app.services.speaker_diarizer import SpeakerDiarizer
from app.providers.base import RawTranscriptSegment

def test_speaker_diarizer_male_female_assignment():
    """Verify that male speakers get male voices and female speakers get female voices."""
    segments = [
        RawTranscriptSegment(
            start_time=0.0,
            end_time=2.0,
            speaker_id="Speaker 1",
            speaker_gender="male",
            text="Hello everyone",
            translated_text="سب کو ہیلو",
            emotion="neutral"
        ),
        RawTranscriptSegment(
            start_time=2.5,
            end_time=5.0,
            speaker_id="Speaker 2",
            speaker_gender="female",
            text="How are you doing today?",
            translated_text="آج آپ کیسی ہیں؟",
            emotion="friendly"
        ),
        RawTranscriptSegment(
            start_time=5.5,
            end_time=7.0,
            speaker_id="Speaker 1",
            speaker_gender="male",
            text="I am doing well.",
            translated_text="میں بالکل ٹھیک ہوں۔",
            emotion="neutral"
        ),
        RawTranscriptSegment(
            start_time=7.5,
            end_time=9.0,
            speaker_id="Speaker 3",
            speaker_gender="male",
            text="Let us begin the discussion.",
            translated_text="آئیں گفتگو شروع کرتے ہیں۔",
            emotion="serious"
        )
    ]

    speaker_map = SpeakerDiarizer.assign_character_voices(
        segments=segments,
        target_language="ur"
    )

    assert "Speaker 1" in speaker_map
    assert "Speaker 2" in speaker_map
    assert "Speaker 3" in speaker_map

    # Speaker 1 must be male
    assert speaker_map["Speaker 1"]["gender"] == "male"
    assert "Asad" in speaker_map["Speaker 1"]["voice_id"] or "Male" in speaker_map["Speaker 1"]["voice_name"]

    # Speaker 2 must be female
    assert speaker_map["Speaker 2"]["gender"] == "female"
    assert "Uzma" in speaker_map["Speaker 2"]["voice_id"] or "Gul" in speaker_map["Speaker 2"]["voice_id"]

    # Speaker 3 must be male and have a different voice from Speaker 1
    assert speaker_map["Speaker 3"]["gender"] == "male"
    assert speaker_map["Speaker 3"]["voice_id"] != speaker_map["Speaker 1"]["voice_id"]

def test_speaker_diarizer_user_override():
    """Verify that user customizations are preserved and not overwritten."""
    segments = [
        RawTranscriptSegment(
            start_time=0.0,
            end_time=2.0,
            speaker_id="Speaker 1",
            speaker_gender="male",
            text="Hello",
            translated_text="سلام"
        )
    ]

    existing_override = {
        "Speaker 1": {
            "speaker_id": "Speaker 1",
            "gender": "female",  # User switched gender to female
            "voice_id": "ur-PK-UzmaNeural",
            "voice_name": "Uzma (Female / زنانی)"
        }
    }

    speaker_map = SpeakerDiarizer.assign_character_voices(
        segments=segments,
        target_language="ur",
        existing_speaker_map=existing_override
    )

    # Should retain the user's manual override
    assert speaker_map["Speaker 1"]["gender"] == "female"
    assert speaker_map["Speaker 1"]["voice_id"] == "ur-PK-UzmaNeural"


def test_speaker_api_endpoints():
    """Verify GET and PUT /api/v1/projects/{id}/speakers endpoints."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. Create a dummy project
    create_res = client.post(
        "/api/v1/projects/",
        json={
            "name": "Speaker Test Project",
            "source_language": "en",
            "target_language": "ur",
            "settings": {
                "dubbing_mode": "ai_dubbing",
            }
        }
    )
    assert create_res.status_code in [200, 201]
    proj_id = create_res.json()["id"]

    # 2. Get speakers (initially empty or default)
    get_res = client.get(f"/api/v1/projects/{proj_id}/speakers")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["dubbing_mode"] == "ai_dubbing"
    assert "speakers" in data

    # 3. Update speakers via PUT
    put_res = client.put(
        f"/api/v1/projects/{proj_id}/speakers",
        json={
            "dubbing_mode": "ai_dubbing",
            "speakers": {
                "Speaker 1": {
                    "speaker_id": "Speaker 1",
                    "gender": "male",
                    "voice_id": "ur-PK-AsadNeural",
                    "voice_name": "Asad (Male)"
                },
                "Speaker 2": {
                    "speaker_id": "Speaker 2",
                    "gender": "female",
                    "voice_id": "ur-PK-UzmaNeural",
                    "voice_name": "Uzma (Female)"
                }
            }
        }
    )
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["speakers"]["Speaker 1"]["gender"] == "male"
    assert updated_data["speakers"]["Speaker 2"]["gender"] == "female"
    assert updated_data["speakers"]["Speaker 2"]["voice_id"] == "ur-PK-UzmaNeural"

    # 4. Verify persistency
    verify_res = client.get(f"/api/v1/projects/{proj_id}/speakers")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["speakers"]["Speaker 1"]["voice_id"] == "ur-PK-AsadNeural"
    assert v_data["speakers"]["Speaker 2"]["gender"] == "female"


def test_acoustic_pitch_detection_synthetic(tmp_path):
    """Verify that acoustic pitch detector separates male and female dialogue lines."""
    import wave
    import numpy as np

    wav_file = tmp_path / "synthetic_dialogue.wav"
    sr = 16000
    
    # 0.0s - 1.5s: 120 Hz sine tone (Male voice)
    # 1.5s - 3.0s: 220 Hz sine tone (Female voice)
    t1 = np.linspace(0, 1.5, int(1.5 * sr), endpoint=False)
    male_wave = (np.sin(2 * np.pi * 120 * t1) * 16000).astype(np.int16)

    t2 = np.linspace(0, 1.5, int(1.5 * sr), endpoint=False)
    female_wave = (np.sin(2 * np.pi * 220 * t2) * 16000).astype(np.int16)

    full_audio = np.concatenate([male_wave, female_wave])

    with wave.open(str(wav_file), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(full_audio.tobytes())

    # Raw segments that were mistakenly labeled as 'Speaker 1' for both
    raw_segments = [
        RawTranscriptSegment(
            start_time=0.0,
            end_time=1.5,
            speaker_id="Speaker 1",
            text="Hello there"
        ),
        RawTranscriptSegment(
            start_time=1.5,
            end_time=3.0,
            speaker_id="Speaker 1",
            text="How are you?"
        )
    ]

    refined = SpeakerDiarizer.refine_segments_with_acoustics(wav_file, raw_segments)

    assert len(refined) == 2
    # Segment 1 should be detected as male
    assert refined[0].speaker_gender == "male"
    assert refined[0].speaker_id == "Speaker 1"

    # Segment 2 should be detected as female and assigned distinct speaker_id
    assert refined[1].speaker_gender == "female"
    assert refined[1].speaker_id == "Speaker 2"


