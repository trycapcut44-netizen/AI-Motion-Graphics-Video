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
        """Measure precise duration of an audio clip."""
        meta = self.inspector.inspect(audio_path)
        return meta.duration

    def fit_segment_audio(
        self,
        segment_audio_path: Path,
        start_time: float,
        end_time: float,
        output_path: Path
    ) -> float:
        """
        Trims artificial leading/trailing TTS silence, adjusts tempo smoothly if
        needed to fit the target window, and adds smooth micro-fades.
        Returns the final duration of the fitted segment.
        """
        target_duration = max(0.2, end_time - start_time)

        # 1. Trim artificial silence generated at start/end by TTS engine
        trimmed_temp = output_path.parent / f"trim_{uuid.uuid4().hex[:8]}.wav"
        filter_trim = (
            "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB,"
            "areverse,"
            "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB,"
            "areverse"
        )
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
                active_input = trimmed_temp
        except Exception:
            active_input = segment_audio_path

        actual_duration = self.measure_audio_duration(active_input)
        if actual_duration <= 0.05:
            # Fallback for degenerate audio
            if active_input != segment_audio_path and trimmed_temp.exists():
                trimmed_temp.unlink()
            return actual_duration

        # 2. Determine optimal tempo adjustment
        tempo = 1.0
        if actual_duration > target_duration:
            # Speech is longer than window: compress up to 1.30x for natural cadence
            tempo = min(1.30, max(1.0, actual_duration / target_duration))
        elif actual_duration < target_duration * 0.70 and actual_duration > 0.6:
            # Speech was delivered significantly faster than video pace: relax slightly
            tempo = max(0.92, actual_duration / (target_duration * 0.85))

        # 3. Apply tempo and micro-fades (10ms) to eliminate audio clicks
        filters = []
        if abs(tempo - 1.0) > 0.02:
            filters.append(f"atempo={tempo:.3f}")
        
        # Estimate expected post-tempo duration for fade-out positioning
        est_dur = actual_duration / tempo
        fade_dur = 0.015
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
        dur = max(0.01, duration_sec)
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
        total video duration. Eliminates awkward artificial pauses and maintains
        natural conversational dialogue flow between sentences.
        """
        if not segments:
            # No dialogue segments, generate complete silence
            return self.generate_silence(total_video_duration, final_output_path)

        # Sort segments by start time
        sorted_segs = sorted(segments, key=lambda x: x[0])
        temp_dir = settings.TEMP_DIR / f"timeline_{uuid.uuid4().hex}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        concat_list_path = temp_dir / "concat_list.txt"
        file_entries = []

        current_time = 0.0
        part_idx = 0
        prev_end = 0.0

        for i, (start, end, raw_audio) in enumerate(sorted_segs):
            orig_gap = max(0.0, start - prev_end)

            if i == 0:
                # Initial delay before dialogue starts
                if start > 0.05:
                    lead_silence = min(start, 0.35)
                    silence_file = temp_dir / f"silence_lead.wav"
                    self.generate_silence(lead_silence, silence_file)
                    file_entries.append(silence_file)
                    current_time += lead_silence
            else:
                # In between sentences:
                if current_time < start:
                    time_gap = start - current_time
                    # If original speaker spoke continuously (gap < 0.8s):
                    # Keep a natural breath pause (150ms - 250ms), eliminating dead gaps
                    if orig_gap < 0.8:
                        pause_len = max(0.12, min(0.25, time_gap))
                    else:
                        # Original video had a genuine scene or visual pause:
                        # Allow proportionate pause capped at 1.0s max
                        pause_len = max(0.15, min(1.0, orig_gap, time_gap))

                    silence_file = temp_dir / f"silence_{part_idx}.wav"
                    self.generate_silence(pause_len, silence_file)
                    file_entries.append(silence_file)
                    current_time += pause_len
                    part_idx += 1
                else:
                    # Speech reached or slightly exceeded current start:
                    # Add small 80ms micro-pause so sentences never collide
                    micro_file = temp_dir / f"silence_micro_{part_idx}.wav"
                    self.generate_silence(0.08, micro_file)
                    file_entries.append(micro_file)
                    current_time += 0.08
                    part_idx += 1

            # Fit and add segment audio
            fitted_audio = temp_dir / f"fitted_{part_idx}.wav"
            fitted_dur = self.fit_segment_audio(raw_audio, start, end, fitted_audio)
            file_entries.append(fitted_audio)
            current_time += fitted_dur
            part_idx += 1
            prev_end = end

        # Fill remaining duration to match total video length
        if current_time < total_video_duration:
            final_gap = total_video_duration - current_time
            if final_gap > 0.02:
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
