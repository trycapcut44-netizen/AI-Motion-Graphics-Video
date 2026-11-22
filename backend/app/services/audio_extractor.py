import subprocess
from pathlib import Path
from typing import Optional
from app.config import settings


class AudioExtractor:
    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or settings.FFMPEG_PATH

    def extract_audio(
        self,
        video_path: Path,
        output_audio_path: Path,
        sample_rate: int = 16000,
        channels: int = 1
    ) -> Path:
        """Extract clean WAV audio from video file for speech processing."""
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        output_audio_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            self.ffmpeg_path,
            "-y",                     # Overwrite output
            "-i", str(video_path),    # Input video
            "-vn",                    # Discard video
            "-acodec", "pcm_s16le",   # 16-bit PCM
            "-ar", str(sample_rate),  # Sample rate (16kHz / 24kHz)
            "-ac", str(channels),     # Channels (1 = mono)
            str(output_audio_path)
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")

        if not output_audio_path.exists() or output_audio_path.stat().st_size == 0:
            raise RuntimeError("Extracted audio file is empty or missing.")

        return output_audio_path
