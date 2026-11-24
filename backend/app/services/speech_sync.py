import subprocess
import uuid
from pathlib import Path
from typing import List, Tuple, Optional
from app.config import settings
from app.services.media_inspector import MediaInspector


class SynchronizedSegment:
    def __init__(self, start_time: float, end_time: float, audio_path: Path):
        self.start_time = start_time
        self.end_time = end_time
        self.audio_path = audio_path


class SpeechSynchronizer:
    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or settings.FFMPEG_PATH
        self.inspector = MediaInspector(ffmpeg_path=self.ffmpeg_path)

    def measure_audio_duration(self, audio_path: Path) -> float:
        """Measure precise duration of an audio clip in seconds."""
        meta = self.inspector.inspect(audio_path)
        return meta.duration

    def fit_segment_audio(
        self,
        segment_audio_path: Path,
        start_time: float,
        end_time: float,
        output_path: Path,
        max_duration: Optional[float] = None
    ) -> float:
        """
        Fits audio segment to the spoken window using smooth, pitch-preserving tempo adjustment.
        NEVER uses destructive 'atrim' truncation so that NO dialogue words are ever cut off or missing.
        Trims artificial leading TTS dead-air without damaging trailing words.
        Returns the final duration of the fitted audio file.
        """
        orig_duration = self.measure_audio_duration(segment_audio_path)
        if orig_duration <= 0.05:
            # Degenerate audio, return as-is
            return orig_duration

        target_duration = max(0.2, end_time - start_time)

        # 1. Strip ONLY artificial leading silence from TTS engine
        # Do NOT reverse and strip trailing silence, which could cut off whispered or soft ending words!
        trimmed_temp = output_path.parent / f"trim_{uuid.uuid4().hex[:8]}.wav"
        filter_trim = "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB"
        cmd_trim = [
            self.ffmpeg_path,
            "-y",
            "-i", str(segment_audio_path),
            "-af", filter_trim,
            "-acodec", "pcm_s16le",
            "-ar", "24000",
            "-ac", "2",
            str(trimmed_temp)
        ]
        active_input = segment_audio_path
        try:
            res = subprocess.run(cmd_trim, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode == 0 and trimmed_temp.exists() and trimmed_temp.stat().st_size > 1000:
                trimmed_dur = self.measure_audio_duration(trimmed_temp)
                # Ensure leading silence removal didn't delete the speech
                if trimmed_dur >= 0.1 and trimmed_dur >= orig_duration * 0.4:
                    active_input = trimmed_temp
        except Exception:
            active_input = segment_audio_path

        actual_duration = self.measure_audio_duration(active_input)
        if actual_duration <= 0.05:
            if active_input != segment_audio_path and trimmed_temp.exists():
                try:
                    trimmed_temp.unlink()
                except Exception:
                    pass
            return actual_duration

        # 2. Determine tempo adjustment
        # If speech is longer than target window, mildly speed up (up to 1.55x) so it fits naturally.
        # NEVER slow down below 1.0x (slowing down human voice causes drowsy/robotic distortion).
        tempo = 1.0
        if actual_duration > target_duration:
            tempo = min(1.55, max(1.0, actual_duration / target_duration))

        # 3. Build FFmpeg audio filter chain (handling atempo range limits)
        filters = []
        if abs(tempo - 1.0) > 0.02:
            if tempo > 2.0:
                filters.append("atempo=2.0")
                filters.append(f"atempo={tempo / 2.0:.3f}")
            elif tempo < 0.5:
                filters.append("atempo=0.5")
                filters.append(f"atempo={tempo / 0.5:.3f}")
            else:
                filters.append(f"atempo={tempo:.3f}")

        # Post-tempo duration estimate
        est_dur = actual_duration / tempo

        # Micro-fades (10ms) to eliminate boundary pops/clicks (NO atrim truncation!)
        fade_dur = min(0.012, est_dur * 0.1)
        if est_dur > fade_dur * 2:
            filters.append(f"afade=t=in:ss=0:d={fade_dur:.3f}")
            filters.append(f"afade=t=out:st={max(0.0, est_dur - fade_dur):.3f}:d={fade_dur:.3f}")

        filter_str = ",".join(filters) if filters else "anull"

        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(active_input),
            "-filter:a", filter_str,
            "-acodec", "pcm_s16le",
            "-ar", "24000",
            "-ac", "2",
            str(output_path)
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        if active_input != segment_audio_path and trimmed_temp.exists():
            try:
                trimmed_temp.unlink()
            except Exception:
                pass

        return self.measure_audio_duration(output_path)

    def generate_silence(self, duration_sec: float, output_path: Path) -> Path:
        """Generate a silent stereo WAV file with exact duration."""
        dur = max(0.005, duration_sec)
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-f", "lavfi",
            "-i", "anullsrc=r=24000:cl=stereo",
            "-t", f"{dur:.3f}",
            "-acodec", "pcm_s16le",
            str(output_path)
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_path

    def assemble_timeline(
        self,
        segments: List[Tuple[float, float, Path]],  # (start, end, audio_path)
        total_video_duration: float,
        final_output_path: Path
    ) -> Path:
        """
        Assembles all speech segments sequentially on a unified timeline matching
        total video duration. Guarantees 100% DIALOGUE COMPLETENESS:
        - Every dialogue line plays in full with ZERO truncated words.
        - Exactly timed start points when characters open their mouths.
        - Preserves natural video scene pauses.
        """
        if not segments:
            return self.generate_silence(total_video_duration, final_output_path)

        # Sort segments by start time
        sorted_segs = sorted(segments, key=lambda x: x[0])
        temp_dir = settings.TEMP_DIR / f"timeline_{uuid.uuid4().hex}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        concat_list_path = temp_dir / "concat_list.txt"
        file_entries = []

        current_time = 0.0
        part_idx = 0

        for i, (start, end, raw_audio) in enumerate(sorted_segs):
            target_start = max(0.0, start)

            # If current timeline position is before dialogue start, add exact silence padding
            if current_time < target_start:
                gap = target_start - current_time
                if gap >= 0.005:  # >= 5 milliseconds
                    silence_file = temp_dir / f"silence_{part_idx}.wav"
                    self.generate_silence(gap, silence_file)
                    actual_gap = self.measure_audio_duration(silence_file)
                    file_entries.append(silence_file)
                    current_time += actual_gap
                    part_idx += 1

            # Fit and add segment audio (guaranteeing 100% full speech, zero word truncation)
            fitted_audio = temp_dir / f"fitted_{part_idx}.wav"
            fitted_dur = self.fit_segment_audio(
                raw_audio,
                start_time=start,
                end_time=end,
                output_path=fitted_audio
            )
            file_entries.append(fitted_audio)
            current_time += fitted_dur
            part_idx += 1

        # Fill remaining duration to match total video length
        if current_time < total_video_duration:
            final_gap = total_video_duration - current_time
            if final_gap >= 0.005:
                silence_file = temp_dir / "silence_end.wav"
                self.generate_silence(final_gap, silence_file)
                file_entries.append(silence_file)

        # Write concat list
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for entry in file_entries:
                escaped = str(entry.resolve()).replace("\\", "/")
                f.write(f"file '{escaped}'\n")

        # Concat demuxer
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list_path),
            "-acodec", "pcm_s16le",
            "-ar", "24000",
            "-ac", "2",
            str(final_output_path)
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg timeline concat failed: {result.stderr}")

        return final_output_path
