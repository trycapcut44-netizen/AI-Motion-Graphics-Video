from pathlib import Path
from typing import List
from app.db.models import TranscriptSegment
from app.registry.languages import get_language


class SubtitleGenerator:
    @staticmethod
    def _format_srt_time(seconds: float) -> str:
        millis = int(round((seconds - int(seconds)) * 1000))
        total_seconds = int(seconds)
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    @staticmethod
    def _format_vtt_time(seconds: float) -> str:
        millis = int(round((seconds - int(seconds)) * 1000))
        total_seconds = int(seconds)
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

    @classmethod
    def generate_srt(
        cls,
        segments: List[TranscriptSegment],
        output_path: Path,
        language_code: str = "hi"
    ) -> Path:
        """Generate standard SRT subtitle file with RTL/Unicode support."""
        lang_info = get_language(language_code)
        is_rtl = bool(lang_info and lang_info.direction == "rtl")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            for idx, seg in enumerate(segments, start=1):
                start_str = cls._format_srt_time(seg.start_time)
                end_str = cls._format_srt_time(seg.end_time)
                text = (seg.translated_text or seg.source_text or "").strip()
                
                # If RTL (Urdu / Arabic), prepend Right-to-Left embedding character if appropriate
                if is_rtl:
                    text = f"\u202B{text}\u202C"

                f.write(f"{idx}\n")
                f.write(f"{start_str} --> {end_str}\n")
                f.write(f"{text}\n\n")

        return output_path

    @classmethod
    def generate_vtt(
        cls,
        segments: List[TranscriptSegment],
        output_path: Path,
        language_code: str = "hi"
    ) -> Path:
        """Generate standard WebVTT subtitle file."""
        lang_info = get_language(language_code)
        is_rtl = bool(lang_info and lang_info.direction == "rtl")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for idx, seg in enumerate(segments, start=1):
                start_str = cls._format_vtt_time(seg.start_time)
                end_str = cls._format_vtt_time(seg.end_time)
                text = (seg.translated_text or seg.source_text or "").strip()

                if is_rtl:
                    text = f"\u202B{text}\u202C"

                f.write(f"{idx}\n")
                f.write(f"{start_str} --> {end_str}\n")
                f.write(f"{text}\n\n")

        return output_path

    @classmethod
    def generate_txt(
        cls,
        segments: List[TranscriptSegment],
        output_path: Path,
        use_translation: bool = True
    ) -> Path:
        """Generate plain text transcript."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            for seg in segments:
                text = seg.translated_text if (use_translation and seg.translated_text) else seg.source_text
                f.write(f"[{cls._format_srt_time(seg.start_time)} - {cls._format_srt_time(seg.end_time)}] {seg.speaker_id}: {text}\n")
        return output_path
