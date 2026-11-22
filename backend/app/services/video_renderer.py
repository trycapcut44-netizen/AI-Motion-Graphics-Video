import subprocess
from pathlib import Path
from typing import Optional
from app.config import settings
from app.services.media_inspector import MediaInspector


class VideoRenderer:
    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or settings.FFMPEG_PATH
        self.inspector = MediaInspector(ffmpeg_path=self.ffmpeg_path)

    def render(
        self,
        video_path: Path,
        audio_path: Path,
        output_mp4_path: Path,
        burn_subtitles: bool = False,
        subtitles_path: Optional[Path] = None
    ) -> Path:
        """
        Multiplexes the original video stream with the dubbed audio track into MP4.
        Preserves video stream lossless copy when possible, or re-encodes safely.
        Validates output playability before completion.
        """
        output_mp4_path.parent.mkdir(parents=True, exist_ok=True)

        if burn_subtitles and subtitles_path and subtitles_path.exists():
            # Burn-in subtitles requires video re-encoding
            # Escape path for FFmpeg subtitles filter on Windows
            sub_escaped = str(subtitles_path.resolve()).replace("\\", "/").replace(":", "\\:")
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", str(video_path),
                "-i", str(audio_path),
                "-filter_complex", f"[0:v]subtitles='{sub_escaped}'[v]",
                "-map", "[v]",
                "-map", "1:a:0",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                "-shortest",
                str(output_mp4_path)
            ]
        else:
            # First attempt: Lossless stream copy for video, mapped explicitly to dubbed audio from input 1
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", str(video_path),
                "-i", str(audio_path),
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                "-shortest",
                str(output_mp4_path)
            ]

        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=300)
        
        # If stream copy failed, fallback to safe x264 re-encode
        if result.returncode != 0:
            fallback_cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", str(video_path),
                "-i", str(audio_path),
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                "-shortest",
                str(output_mp4_path)
            ]
            fallback_res = subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=300)
            if fallback_res.returncode != 0:
                raise RuntimeError(f"FFmpeg video render failed: {fallback_res.stderr}")

        # Verification of rendered output
        if not output_mp4_path.exists() or output_mp4_path.stat().st_size < 1024:
            raise RuntimeError("Rendered MP4 file is missing or invalid size.")

        meta = self.inspector.inspect(output_mp4_path)
        if meta.duration <= 0.1:
            raise RuntimeError(f"Rendered MP4 duration is invalid: {meta.duration}s")

        return output_mp4_path
