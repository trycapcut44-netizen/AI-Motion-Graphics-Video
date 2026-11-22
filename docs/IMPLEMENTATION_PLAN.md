# GlobalDub AI — Implementation Plan

## 1. Executive Overview

GlobalDub AI is an enterprise-ready, multilingual AI video dubbing SaaS platform. It automates the complex pipeline of extracting audio, transcribing speech with timestamps, translating into the target language, synthesizing high-quality neural speech in the target language with voice matching, synchronizing speech timing via intelligent audio processing, generating multilingual subtitles (with Unicode and RTL support for Urdu/Arabic), mixing dubbed speech with original background audio, and rendering the final MP4.

---

## 2. Technical Stack and Environment Verification

- **Host Environment**: Windows 10/11 x64, Python 3.13.14, Node.js v24.17.0, npm 11.13.0.
- **Media Engine**: FFmpeg 7.1 Essentials (`imageio_ffmpeg` static binary engine & fallback wrappers).
- **Backend**: FastAPI (Python 3.13+), Pydantic v2, SQLAlchemy 2.0 (SQLite for local dev, PostgreSQL-ready architecture), Background Job Queue.
- **AI Integrations**:
  - Official Google Gen AI SDK (`google-genai`) for Gemini Multimodal Audio transcription (`gemini-2.0-flash` / `gemini-2.5-flash`), language detection, context-aware translation, and Gemini TTS / Voices API (`gemini-3.8-flash-tts` / `v1beta/voices`).
  - Provider-agnostic modular adapters: `TranscriptionProvider`, `TranslationProvider`, `TTSProvider`, `VoiceReplicationProvider`.
  - Edge TTS neural adapter for 100+ languages (Devanagari/Hindi, Urdu, Arabic, Japanese, Chinese, Spanish, French, German, etc.) providing instant, reliable, zero-cost high-fidelity speech synthesis without requiring third-party API keys.
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide icons, Dark-mode SaaS UI, real-time job status polling, interactive bilingual transcript editor with RTL support.

---

## 3. Prioritized Implementation Stages

### Stage 1: Documentation & Architecture Specifications (Phase 0)
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/FEATURE_STATUS.md`
- `docs/API_SPECIFICATION.md`

### Stage 2: Centralized Multilingual Language Registry & Provider Adapters (Phase 4 & 8)
- Comprehensive registry with ISO codes, script orientation (LTR/RTL), font guidance, and provider capability mappings.
- Verified language matrix: English, Hindi, Urdu, Arabic, Spanish, French, German, Japanese, Chinese, etc.
- Provider interfaces:
  - `TranscriptionProvider` (Gemini Audio / Fallback Whisper)
  - `LanguageDetectionProvider`
  - `TranslationProvider` (Gemini Multilingual Translator)
  - `TTSProvider` (Gemini TTS & Neural TTS Adapter)
  - `VoiceReplicationProvider` (Gemini Consent-Verified Voices API)

### Stage 3: Database & Media Storage Architecture (Phase 5, 17, 18)
- SQLite database schema:
  - `Project`, `MediaAsset`, `TranscriptSegment`, `VoiceConfiguration`, `ProcessingJob`, `ConsentRecord`, `UsageRecord`.
- Secure private storage structure:
  - `storage/uploads/`
  - `storage/processed/`
  - `storage/references/`
  - `storage/temp/`
- Security measures: UUID-based tokens, path traversal prevention, FFmpeg safe argument lists, API key server-side isolation.

### Stage 4: Media Processing Engine (Phase 6, 7, 12, 13, 14, 15)
- `MediaInspector`: FFprobe & FFmpeg stream inspector (duration, resolution, fps, audio channels, codecs).
- `AudioExtractor`: Extract pristine 16-bit 16kHz/24kHz mono WAV audio.
- `SpeechSynchronizer`: Dynamic time-stretching (`atempo`), silent padding, boundary clamping, and overflow protection.
- `AudioMixer`: Source ducking, background gain adjustment, dubbed voice amplification, and peak limiting.
- `SubtitleGenerator`: SRT and WebVTT generation with RTL formatting and Unicode compliance.
- `VideoRenderer`: H.264/AAC MP4 multiplexing with video stream copying where possible.

### Stage 5: Backend API & Background Job Pipeline (Phase 5, 16, 19)
- REST API v1 (`/api/v1`):
  - Projects CRUD (`/projects`)
  - File upload with validation (`/projects/{id}/upload`)
  - Languages registry & compatibility query (`/languages`, `/languages/compatibility`)
  - Voices catalog (`/voices`)
  - Pipeline triggers: transcription, translation, voice dubbing (`/transcription`, `/translation`, `/dub`)
  - Transcript editor endpoints (`/projects/{id}/transcript`)
  - Background Job polling & cancellation (`/jobs/{id}`)
  - Download endpoints for MP4, SRT, VTT, TXT (`/projects/{id}/downloads/{asset_type}`)
  - Usage and cost estimation tracking (`/usage`)

### Stage 6: Modern SaaS Frontend Dashboard (Phase 3)
- Polished dark-first interface:
  - **Dashboard**: Metric cards, recent jobs, quick action buttons.
  - **New Dubbing Project wizard**:
    - Step 1: Upload (drag-and-drop, video preview, size/duration inspection).
    - Step 2: Language Selection (searchable source with Auto Detect, target language, live compatibility matrix).
    - Step 3: Voice Selection (gender filters, sample preview player, speed & pitch controls, consent-based replication modal).
    - Step 4: Dubbing Settings (subtitle toggle, background audio volume, ducking ratio).
    - Step 5: Interactive Transcript Editor (side-by-side bilingual view, inline editing, RTL rendering, segment audio test).
    - Step 6: Processing & Export (live stage tracking, final video player, download links for MP4, SRT, VTT, TXT).
  - **Languages & Voices Explorer**: Interactive capability matrix.
  - **Usage & Cost Tracking**: Token and audio duration metrics.
  - **Settings & Diagnostics**: System checks, FFmpeg health, API key status.

### Stage 7: Automated Testing & Synthetic Verification (Phase 11, 20)
- Unit tests for language registry, subtitle generator (RTL/Unicode), audio synchronizer, upload validator.
- Integration tests with synthetic media fixtures (generating a synthetic MP4 with tone/beeps via FFmpeg).
- End-to-end pipeline test from synthetic upload to dubbed MP4 and SRT generation.

### Stage 8: Documentation, Windows Setup & Delivery (Phase 21, 22)
- Comprehensive Windows setup guide.
- `.env.example` with clear instructions.
- Verification report and operational notes.
