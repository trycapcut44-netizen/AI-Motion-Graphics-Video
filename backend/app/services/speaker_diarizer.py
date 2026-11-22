import wave
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from app.registry.voices import get_voices_for_language, VOICE_CATALOG
from app.providers.base import RawTranscriptSegment


class SpeakerDiarizer:
    @staticmethod
    def detect_segment_pitch_and_gender(
        wav_path: Path, start_time: float, end_time: float
    ) -> Tuple[float, str]:
        """
        Performs autocorrelation pitch tracking on the segment audio slice to determine
        fundamental frequency (F0) and biological gender:
        - F0 < 165 Hz: Male
        - F0 >= 165 Hz: Female
        """
        if not wav_path or not Path(wav_path).exists() or end_time <= start_time:
            return 0.0, "male"

        try:
            with wave.open(str(wav_path), "rb") as wf:
                sr = wf.getframerate()
                total_frames = wf.getnframes()
                start_frame = max(0, min(total_frames - 1, int(start_time * sr)))
                dur_frames = max(sr // 4, int((end_time - start_time) * sr))
                dur_frames = min(dur_frames, total_frames - start_frame)
                if dur_frames <= 0:
                    return 0.0, "male"

                wf.setpos(start_frame)
                raw_bytes = wf.readframes(dur_frames)
                samples = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32)

            # Analyze in 50ms frames with 25ms step
            frame_len = int(sr * 0.05)
            hop_len = int(sr * 0.025)
            min_lag = int(sr / 350)  # Max 350 Hz
            max_lag = int(sr / 75)   # Min 75 Hz

            pitches = []
            for i in range(0, len(samples) - frame_len, hop_len):
                frame = samples[i : i + frame_len]
                if np.max(np.abs(frame)) < 400:
                    continue
                corr = np.correlate(frame, frame, mode="full")[len(frame) - 1 :]
                corr[:min_lag] = 0
                if len(corr) < max_lag:
                    continue
                peak = np.argmax(corr[:max_lag])
                if peak > 0:
                    f0 = sr / peak
                    if 75 <= f0 <= 350:
                        pitches.append(f0)

            if not pitches:
                return 0.0, "male"

            median_pitch = float(np.median(pitches))
            gender = "female" if median_pitch >= 165.0 else "male"
            return median_pitch, gender
        except Exception as e:
            print(f"[SpeakerDiarizer] Pitch detection warning: {e}")
            return 0.0, "male"

    @staticmethod
    def refine_segments_with_acoustics(
        wav_path: Path, segments: List[Any]
    ) -> List[Any]:
        """
        Analyzes each dialogue segment's voice pitch.
        If all segments were grouped as 'Speaker 1' or had missing genders,
        separates them into distinct speakers ('Speaker 1 [Male]', 'Speaker 2 [Female]', etc.).
        """
        if not wav_path or not Path(wav_path).exists() or not segments:
            return segments

        pitches = []
        genders = []

        for seg in segments:
            pitch, gender = SpeakerDiarizer.detect_segment_pitch_and_gender(
                wav_path, seg.start_time, seg.end_time
            )
            pitches.append(pitch)
            genders.append(gender)

        # Check if the transcriber labeled everything as single speaker
        current_speakers = {getattr(s, "speaker_id", "Speaker 1") for s in segments}
        all_same_speaker = len(current_speakers) <= 1

        male_speaker_id = "Speaker 1"
        female_speaker_id = "Speaker 2"

        for i, seg in enumerate(segments):
            acoustic_gender = genders[i]

            # If segment didn't have explicit gender or if all were same speaker, update gender
            if not getattr(seg, "speaker_gender", None) or all_same_speaker:
                setattr(seg, "speaker_gender", acoustic_gender)

            # If all were collapsed into Speaker 1, split into distinct characters
            if all_same_speaker:
                if acoustic_gender == "female":
                    setattr(seg, "speaker_id", female_speaker_id)
                else:
                    setattr(seg, "speaker_id", male_speaker_id)

        return segments

    @staticmethod
    def assign_character_voices(
        target_language: str,
        segments: List[Any],
        existing_map: Optional[Dict[str, Any]] = None,
        existing_speaker_map: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes dialogue segments, identifies all unique speakers and their detected
        genders, and maps each character to a distinct natural voice in the target language.
        Preserves user overrides if already configured.
        """
        existing = existing_speaker_map or existing_map or {}
        available_voices = get_voices_for_language(target_language)
        male_voices = [v for v in available_voices if v.gender == "male"]
        female_voices = [v for v in available_voices if v.gender == "female"]

        # If a language only has one gender in its catalog, fallback gracefully
        if not male_voices and available_voices:
            male_voices = available_voices
        if not female_voices and available_voices:
            female_voices = available_voices

        # Collect unique speakers in order of appearance
        unique_speakers = []
        speaker_genders = {}

        for seg in segments:
            spk = getattr(seg, "speaker_id", None) or "Speaker 1"
            if spk not in unique_speakers:
                unique_speakers.append(spk)

            # Detect gender from segment metadata
            detected_gender = getattr(seg, "speaker_gender", None) or getattr(seg, "gender", None) or "male"
            detected_gender = detected_gender.lower().strip()
            if detected_gender not in ["male", "female"]:
                detected_gender = "male"

            if spk not in speaker_genders:
                speaker_genders[spk] = detected_gender

        # Default voice assignments
        speaker_map: Dict[str, Any] = {}
        male_idx = 0
        female_idx = 0

        for spk in unique_speakers:
            # If user already customized this speaker, keep user's settings
            if spk in existing and existing[spk].get("voice_id"):
                speaker_map[spk] = existing[spk]
                continue

            gender = speaker_genders.get(spk, "male")
            if gender == "female" and female_voices:
                assigned_voice = female_voices[female_idx % len(female_voices)]
                female_idx += 1
            elif male_voices:
                assigned_voice = male_voices[male_idx % len(male_voices)]
                male_idx += 1
            elif available_voices:
                assigned_voice = available_voices[0]
            else:
                assigned_voice = None

            voice_id = assigned_voice.voice_id if assigned_voice else "en-US-GuyNeural"
            voice_name = assigned_voice.name if assigned_voice else "Standard Voice"
            v_gender = assigned_voice.gender if assigned_voice else gender
            provider = getattr(assigned_voice, "provider", "edge_tts")

            speaker_map[spk] = {
                "speaker_id": spk,
                "character_name": f"{spk} ({'مردانہ / Male' if v_gender == 'male' else 'زنانی / Female'})",
                "gender": v_gender,
                "voice_id": voice_id,
                "voice_name": voice_name,
                "provider": provider,
                "speed": 1.0,
                "pitch": 1.0,
            }

        return speaker_map
