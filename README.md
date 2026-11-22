# GlobalDub AI — Multilingual AI Video Dubbing SaaS Platform

GlobalDub AI is a full-stack, enterprise-oriented video localization platform. It allows users to upload a video in one language (or Auto-Detect), select any verified target language, review and edit context-aware translations, synthesize natural neural speech, synchronize speech cadence with timeline bounds, duck original background audio, generate subtitles with Unicode and RTL support (Urdu, Arabic, Hindi, etc.), and render playable MP4 outputs.

---

## 1. Key Capabilities

- **Dynamic Multilingual Pipeline**: Does not hardcode language pairs. Supports English, Hindi (Devanagari), Urdu (Nasta'liq / RTL), Arabic (RTL), Spanish, French, German, Japanese, Chinese, Russian, Portuguese, Italian, Turkish, Korean, and more.
- **Provider-Neutral Modular Architecture**:
  - **Speech-to-Text**: Google Gemini Multimodal Audio API (`gemini-2.0-flash`) with timestamped segment extraction and speaker diarization.
  - **Translation Engine**: Gemini Multilingual Contextual Translator with custom tone profiles (`natural`, `conversational`, `formal`).
  - **Text-to-Speech**: Built-in Edge Neural Speech adapter covering 100+ languages without per-token charges or third-party API keys, plus Gemini TTS (`gemini-3.8-flash-tts`).
  - **Voice Replication**: Dedicated compliance workflow adhering to Google's 2-part verification requirements (source audio + exact consent reading) with revocable voice IDs.
- **Media Engine (FFmpeg 7.1)**:
  - Video stream probing (resolution, frame rate, audio channels, duration).
  - High-resolution 16-bit PCM WAV extraction.
  - Speech synchronizer with silence padding and `atempo` time-stretching (0.8x - 1.35x).
  - Background audio mixer with ducking (gain: 0.15) and limiter peak protection.
  - Subtitle engine (SRT & WebVTT) with bidirectional Unicode embedding (`\u202B` / `\u202C`).
  - Lossless video passthrough / H.264 AAC multiplexing with playability validation.
- **Interactive Bilingual Transcript Editor**:
  - Side-by-side or stacked view of original speech vs. translated dialogue.
  - Inline editing before speech synthesis.
  - Right-to-Left (RTL) writing system support for Urdu and Arabic.
  - Segment approval toggles and edit version tracking.
- **Asynchronous Background Processing**:
  - Persistent SQLite job records with migration-ready SQLAlchemy models.
  - Progress stages: `EXTRACTING_AUDIO` → `TRANSCRIBING` → `TRANSLATING` → `AWAITING_REVIEW` → `GENERATING_SPEECH` → `SYNCHRONIZING` → `MIXING` → `RENDERING` → `COMPLETED`.
  - Non-blocking job queue with cancellation and retry support.
- **Modern SaaS Dashboard**:
  - Polished dark SaaS design built with Next.js 14 App Router, TypeScript, and Tailwind CSS.
  - Step-based dubbing wizard (Steps 1 to 6).
  - Real usage and cost tracking metrics.

---

## 2. Supported Languages Matrix

| Code | Language | Script | Layout | Transcription | Translation | TTS Voices | Subtitles |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `auto` | Auto Detect | Universal | LTR | **Supported** | - | - | - |
| `hi` | Hindi | Devanagari | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `ur` | Urdu | Arabic | RTL | **Supported** | **Supported** | **Supported** | **Supported** |
| `ar` | Arabic | Arabic | RTL | **Supported** | **Supported** | **Supported** | **Supported** |
| `en` | English | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `es` | Spanish | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `fr` | French | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `de` | German | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `ja` | Japanese | Kanji / Kana | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `zh` | Chinese (Simp.) | Hanzi | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `pt` | Portuguese | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `ru` | Russian | Cyrillic | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `it` | Italian | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `ko` | Korean | Hangul | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `tr` | Turkish | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |
| `fil` | Filipino (Tagalog) | Latin | LTR | **Supported** | **Supported** | **Supported** | **Supported** |

---

## 3. Quick Start (Windows Development)

### 3.1 Install Dependencies
```powershell
# Backend
python -m pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
npm run build
cd ..
```

### 3.2 Configure Environment
```powershell
Copy-Item .env.example .env
```
Add your `GEMINI_API_KEY` in `.env` (optional for testing; offline fallback engine is built-in).

### 3.3 Launch Services
In Terminal 1 (Backend):
```powershell
python backend/run.py
```

In Terminal 2 (Frontend):
```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.
API Swagger Docs are available at `http://127.0.0.1:8000/docs`.

---

## 4. Running Automated Tests

Execute the complete automated test suite:
```powershell
python -m pytest backend/tests -v
```

All 25 automated tests pass with 100% compliance:
- `test_upload_validation.py`: File extension whitelist, size constraints, path traversal defense.
- `test_language_registry.py`: ISO codes, RTL directionality, compatibility validation, Filipino (`fil`) and voice filters.
- `test_subtitles.py`: Standard SRT and WebVTT syntax, Devanagari Unicode, Urdu/Arabic RTL markers.
- `test_audio_sync.py`: Silence synthesis, duration measurement, multi-segment timeline assembly.
- `test_transcript_editing.py`: Segment edits, approval status, version tracking.
- `test_speaker_diarizer.py`: Multi-character acoustic F0 pitch analysis, male/female character voice mapping.
- `test_license_and_kill_switch.py`: Client license issuance, 1-click access revocation, master emergency kill-switch, remote online control.
- `test_admin_access_control.py`: Granular user feature permissions, activation/suspension toggles.
- `test_media_pipeline.py`: Full synthetic video creation, extraction, neural TTS, mixing, and playable MP4 rendering.

---

## 5. Security & Access Control Highlights

- **1-Click Client Access Revocation & Kill-Switch**: Issue unique client licenses with custom expiry and revoke any client's access instantly with a single click.
- **Remote Cloud Kill-Switch**: Remotely terminate access on distributed machines via an external JSON endpoint (e.g. GitHub Gist / raw URL).
- **Master Admin Password Protection**: Admin panel and licensing controls are locked behind a hashed master admin password, hidden from client dashboards.
- **Server-Side API Key Storage**: `GEMINI_API_KEY` is loaded exclusively on the backend and is never exposed in browser bundles or API responses.
- **Anti-Traversal Internal Storage**: Uploaded files receive internal UUID keys (`<uuid>.mp4`). User-supplied paths are never passed to the operating system.
- **Safe FFmpeg Execution**: All FFmpeg and FFprobe calls use argument arrays (`subprocess.run([exe, ...])`) without shell string interpolation.
- **Consent-First Voice Replication**: Consent records are timestamped and linked to projects; unapproved cloning is blocked.
- **Private Data Purge**: Project deletion purges all uploaded, intermediate, and rendered media from disk.
