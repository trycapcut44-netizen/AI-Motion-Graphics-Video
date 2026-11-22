import subprocess
from pathlib import Path
from typing import Optional
from app.config import settings


class AudioMixer:
    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or settings.FFMPEG_PATH

    def mix_audio(
        self,
        original_audio_path: Optional[Path],
        dubbed_audio_path: Path,
        output_mixed_path: Path,
        preserve_background: bool = True,
        original_gain: float = 0.15,
        dubbed_gain: float = 1.0
    ) -> Path:
        """
        Mixes original background audio (ducked) with dubbed narration.
        Applies peak normalization to prevent clipping.
        """
        output_mixed_path.parent.mkdir(parents=True, exist_ok=True)

        if not preserve_background or original_gain <= 0.01 or not original_audio_path or not original_audio_path.exists():
            # Speech only mode - original audio is 100% muted and replaced by clean AI dubbed voice
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", str(dubbed_audio_path),
                "-filter:a", f"volume={dubbed_gain:.2f},alimiter=limit=0.95",
                "-acodec", "pcm_s16le",
                "-ar", "44100",
                "-ac", "2",
                str(output_mixed_path)
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return output_mixed_path

        # Mixing mode: original (ducked) + dubbed narration
        filter_complex = (
            f"[0:a]volume={original_gain:.2f}[orig];"
            f"[1:a]volume={dubbed_gain:.2f}[dub];"
            f"[orig][dub]amix=inputs=2:duration=first:dropout_transition=0[mixed];"
            f"[mixed]alimiter=limit=0.95[out]"
        )

        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", str(original_audio_path),
            "-i", str(dubbed_audio_path),
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-acodec", "pcm_s16le",
            "-ar", "44100",
            "-ac", "2",
            str(output_mixed_path)
        ]

        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg audio mixing failed: {result.stderr}")

        return output_mixed_path
