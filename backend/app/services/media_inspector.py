import subprocess
import json
import re
from pathlib import Path
from typing import Optional
from app.config import settings
from app.schemas.media import MediaMetadata


class MediaInspector:
    def __init__(self, ffmpeg_path: Optional[str] = None, ffprobe_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or settings.FFMPEG_PATH
        self.ffprobe_path = ffprobe_path or settings.FFPROBE_PATH

    def inspect(self, file_path: Path) -> MediaMetadata:
        """Inspect video file metadata using FFprobe or FFmpeg fallback."""
        if not file_path.exists():
            raise FileNotFoundError(f"Media file not found: {file_path}")

        # Strategy A: Use ffprobe if available
        if self.ffprobe_path:
            try:
                return self._inspect_with_ffprobe(file_path)
            except Exception as e:
                pass

        # Strategy B: Fall back to parsing ffmpeg -i output
        return self._inspect_with_ffmpeg(file_path)

    def _inspect_with_ffprobe(self, file_path: Path) -> MediaMetadata:
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(file_path)
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)
        if result.returncode != 0:
            raise RuntimeError(f"FFprobe failed: {result.stderr}")

        data = json.loads(result.stdout)
        format_info = data.get("format", {})
        streams = data.get("streams", [])

        duration = float(format_info.get("duration", 0.0))
        bitrate = int(format_info.get("bit_rate", 0)) if format_info.get("bit_rate") else None
        format_name = format_info.get("format_name", "")

        width, height, fps, v_codec = None, None, None, None
        a_codec, a_channels, a_sample_rate = None, None, None

        for stream in streams:
            codec_type = stream.get("codec_type")
            if codec_type == "video" and not width:
                width = stream.get("width")
                height = stream.get("height")
                v_codec = stream.get("codec_name")
                r_frame_rate = stream.get("r_frame_rate", "0/0")
                if "/" in r_frame_rate:
                    num, den = map(float, r_frame_rate.split("/"))
                    fps = round(num / den, 2) if den > 0 else None
            elif codec_type == "audio" and not a_codec:
                a_codec = stream.get("codec_name")
                a_channels = stream.get("channels")
                sample_rate_str = stream.get("sample_rate")
                a_sample_rate = int(sample_rate_str) if sample_rate_str else None

        return MediaMetadata(
            duration=duration,
            width=width,
            height=height,
            fps=fps,
            video_codec=v_codec,
            audio_codec=a_codec,
            audio_channels=a_channels,
            sample_rate=a_sample_rate,
            bitrate=bitrate,
            format_name=format_name,
        )

    def _inspect_with_ffmpeg(self, file_path: Path) -> MediaMetadata:
        cmd = [self.ffmpeg_path, "-i", str(file_path)]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)
        output = result.stderr  # FFmpeg outputs stream info on stderr

        # Extract duration
        duration = 0.0
        dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", output)
        if dur_match:
            hours, mins, secs = dur_match.groups()
            duration = int(hours) * 3600 + int(mins) * 60 + float(secs)

        # Extract video info (e.g. Video: h264 (...), yuv420p, 1920x1080, 30 fps)
        width, height, fps, v_codec = None, None, None, None
        v_match = re.search(r"Stream #\d+:\d+.*Video:\s*(\w+)[^,]*,\s*[^,]*,\s*(\d+)x(\d+).*?([\d\.]+)\s*fps", output)
        if v_match:
            v_codec = v_match.group(1)
            width = int(v_match.group(2))
            height = int(v_match.group(3))
            fps = float(v_match.group(4))
        else:
            # Try alternate dimension match
            dim_match = re.search(r"(\d{3,4})x(\d{3,4})", output)
            if dim_match:
                width = int(dim_match.group(1))
                height = int(dim_match.group(2))

        # Extract audio info (e.g. Stream #0:1: Audio: aac (...), 48000 Hz, stereo)
        a_codec, a_channels, a_sample_rate = None, None, None
        a_match = re.search(r"Stream #\d+:\d+.*Audio:\s*(\w+)[^,]*,?\s*(\d+)\s*Hz,\s*([^,]+)", output)
        if a_match:
            a_codec = a_match.group(1)
            a_sample_rate = int(a_match.group(2))
            ch_desc = a_match.group(3).lower()
            if "stereo" in ch_desc:
                a_channels = 2
            elif "mono" in ch_desc:
                a_channels = 1
            else:
                a_channels = 2

        return MediaMetadata(
            duration=duration,
            width=width,
            height=height,
            fps=fps,
            video_codec=v_codec,
            audio_codec=a_codec,
            audio_channels=a_channels,
            sample_rate=a_sample_rate,
            format_name=file_path.suffix.lstrip("."),
        )
