# GlobalDub AI — System Architecture

## 1. System Overview

GlobalDub AI adopts a decoupled, modular service-oriented architecture designed for scalability, security, and provider independence:

```
+-------------------------------------------------------------------------------+
|                                Frontend (Next.js)                             |
|  - App Router, TypeScript, Tailwind CSS, Dark Theme                           |
|  - Project Wizard, Bilingual Transcript Editor (RTL-ready), Player & Downloads|
+---------------------------------------+---------------------------------------+
                                        | HTTP / JSON REST API
                                        v
+-------------------------------------------------------------------------------+
|                           FastAPI Backend Application                         |
|  - Security & Validation (Path traversal defense, rate-limiting, size checks) |
|  - SQLite Database (SQLAlchemy 2.0 ORM, PostgreSQL-ready schemas)             |
|  - Asynchronous Background Worker Queue                                       |
+-------------------+-------------------+-------------------+-------------------+
                    |                   |                   |
                    v                   v                   v
+-----------------------+ +---------------------+ +-----------------------------+
|    Media Engine       | |  AI Provider Engine | |       Storage Manager       |
| - FFmpeg 7.1/imageio  | | - Modular Adapters  | | - Private storage isolation |
| - Media Inspector     | |   * Transcription   | |   * storage/uploads/        |
| - Audio Extractor     | |   * Translation     | |   * storage/processed/      |
| - Audio Synchronizer  | |   * TTS Synthesizer | |   * storage/references/     |
| - Subtitle Engine     | |   * Voice Replic.   | |   * storage/temp/           |
| - Video Renderer      | | - Gemini API        | | - Auto-cleanup on fail/done |
| - Audio Mixer         | | - Edge Neural TTS   | | - UUID tokenized paths      |
+-----------------------+ +---------------------+ +-----------------------------+
```

---

## 2. Core Components

### 2.1 Media Engine (`app/services/`)
1. **`media_inspector.py`**:
   - Inspects container, video stream (codec, dimensions, aspect ratio, frame rate, duration) and audio stream (codec, channels, sample rate, bit rate).
   - Graceful fallback: Uses `ffprobe` when available, and `ffmpeg -i` output parsing when ffprobe is not in path.
2. **`audio_extractor.py`**:
   - Extracts clean 16-bit PCM WAV (16kHz or 24kHz mono) optimized for speech-to-text models.
3. **`speech_sync.py`**:
   - Aligns synthesized speech clips to original segment start/end timestamps.
   - Calculates duration delta. If speech is shorter, pads silence. If speech is longer, applies gradual time stretching via `atempo` (within 0.8x to 1.3x) to retain natural acoustic timbre.
4. **`audio_mixer.py`**:
   - Performs audio ducking: reduces original background audio by a configurable factor (e.g. 0.15) during speech and mixes synthesized audio at 1.0.
5. **`subtitle_generator.py`**:
   - Generates standard SRT and WebVTT with milliseconds precision (`00:00:01,250 --> 00:00:04,500`).
   - Supports RTL text markers (`\u202B` / `\u202C` for Urdu, Arabic) and UTF-8 encoding.
6. **`video_renderer.py`**:
   - Multiplexes original video track with newly dubbed, synchronized audio into a web-optimized MP4 container (H.264 + AAC).
   - Validates playable output size and duration before marking jobs completed.

---

## 3. Modular AI Provider Architecture (`app/providers/`)

To prevent tight vendor lock-in and enable seamless offline or alternate-provider fallbacks:

```python
class BaseTranscriptionProvider(ABC):
    async def transcribe(self, audio_path: Path, source_lang: Optional[str] = None) -> List[TranscriptSegmentData]: ...

class BaseTranslationProvider(ABC):
    async def translate(self, text_segments: List[str], source_lang: str, target_lang: str, context: Optional[str] = None) -> List[str]: ...

class BaseTTSProvider(ABC):
    async def synthesize(self, text: str, voice_id: str, language_code: str, speed: float = 1.0) -> bytes: ...

class BaseVoiceReplicationProvider(ABC):
    async def register_replicated_voice(self, name: str, source_audio: Path, consent_audio: Path) -> VoiceProfile: ...
    async def revoke_voice(self, voice_id: str) -> bool: ...
```

### Supported Providers:
- **Google Gemini API (`google-genai`)**:
  - `gemini-2.0-flash` / `gemini-2.5-flash` for high-accuracy multimodal transcription with timestamp recognition.
  - Gemini translation with tone/context preservation.
  - Gemini TTS (`gemini-3.8-flash-tts`) & Voices API (`v1beta/voices`).
- **Edge Neural TTS Adapter**:
  - Microsoft Edge neural speech service adapter supporting 100+ languages including Hindi (`hi-IN-SwaraNeural`, `hi-IN-MadhurNeural`), Urdu (`ur-PK-UzmaNeural`, `ur-PK-AsadNeural`), Arabic (`ar-SA-ZariyahNeural`, `ar-SA-HamedNeural`), Japanese, Spanish, German, etc.
  - Operates reliably without requiring third-party API keys or incurring per-token costs.

---

## 4. Database Schema (`app/db/models.py`)

- **`projects`**: Top-level entity representing a dubbing project.
- **`media_assets`**: Tracks raw uploads, extracted audio, generated audio segments, and rendered video.
- **`transcript_segments`**: Stores segment timing, original text, translated text, speaker tag, and approval status.
- **`voice_configurations`**: Selected voice, speed, pitch, and replication flags.
- **`processing_jobs`**: Live status (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), current stage, progress percentage, error message.
- **`consent_records`**: Records explicit legal consent, timestamps, and verification tokens for replicated voices.
- **`usage_records`**: Logs tokens, duration, and estimated provider costs.

---

## 5. Security & Privacy Guarantees

1. **Zero Key Exposure**: API keys (`GEMINI_API_KEY`) reside exclusively in environment variables and are never transmitted to frontend clients.
2. **Path Traversal Defense**: All filenames are converted into internal UUIDs (`uuid4()`). User-provided filenames are only kept as metadata.
3. **Subprocess Sanitization**: FFmpeg commands are executed strictly as lists of arguments (`subprocess.run(["ffmpeg", ...])`), never through `shell=True` string interpolation.
4. **Isolated Storage**: Uploads and rendered media are stored in a private directory outside web roots. Downloads are gated through authorization endpoints.
5. **Private Cleanup**: Temporary segment WAVs and failed jobs are immediately purged.
