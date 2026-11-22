import os
import shutil
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
PROCESSED_DIR = STORAGE_DIR / "processed"
REFERENCES_DIR = STORAGE_DIR / "references"
TEMP_DIR = STORAGE_DIR / "temp"

# Ensure runtime directories exist
for folder in [STORAGE_DIR, UPLOADS_DIR, PROCESSED_DIR, REFERENCES_DIR, TEMP_DIR]:
    folder.mkdir(parents=True, exist_ok=True)


def get_ffmpeg_executable() -> str:
    """Detect FFmpeg executable from PATH, static-ffmpeg, or imageio-ffmpeg."""
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    return "ffmpeg"


def get_ffprobe_executable() -> str:
    """Detect FFprobe executable or return fallback indicator."""
    path = shutil.which("ffprobe")
    if path:
        return path
    # If ffprobe is adjacent to ffmpeg
    ffmpeg_exe = get_ffmpeg_executable()
    if ffmpeg_exe:
        candidate = Path(ffmpeg_exe).parent / "ffprobe.exe"
        if candidate.exists():
            return str(candidate)
    return ""


class Settings(BaseModel):
    PROJECT_NAME: str = "GlobalDub AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Storage Paths
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = STORAGE_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    PROCESSED_DIR: Path = PROCESSED_DIR
    REFERENCES_DIR: Path = REFERENCES_DIR
    TEMP_DIR: Path = TEMP_DIR
    
    # Executables
    FFMPEG_PATH: str = get_ffmpeg_executable()
    FFPROBE_PATH: str = get_ffprobe_executable()
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{STORAGE_DIR / 'globaldub.db'}")
    
    # Google Gemini Credentials & Models
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    GEMINI_TRANSCRIPTION_MODEL: str = os.getenv("GEMINI_TRANSCRIPTION_MODEL", "gemini-2.0-flash")
    GEMINI_TRANSLATION_MODEL: str = os.getenv("GEMINI_TRANSLATION_MODEL", "gemini-2.0-flash")
    GEMINI_TTS_MODEL: str = os.getenv("GEMINI_TTS_MODEL", "gemini-2.0-flash-tts")
    
    # Processing Limits
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(250 * 1024 * 1024))) # 250 MB
    MAX_VIDEO_DURATION_SECONDS: int = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", "600")) # 10 minutes
    MAX_CONCURRENT_JOBS: int = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))
    
    # Supported input media extensions
    ALLOWED_EXTENSIONS: set = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}
    
    # Security & CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()
