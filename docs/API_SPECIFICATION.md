# GlobalDub AI — API Specification (v1)

Base URL: `http://127.0.0.1:8000/api/v1`

---

## 1. Projects API

### `POST /projects`
Creates a new dubbing project record.
- **Request Body**:
  ```json
  {
    "name": "Tech Keynote Dub",
    "source_language": "auto",
    "target_language": "hi",
    "settings": {
      "background_audio_enabled": true,
      "original_audio_volume": 0.15,
      "dubbed_speech_volume": 1.0,
      "subtitles_enabled": true,
      "burn_subtitles": false,
      "translation_style": "natural"
    }
  }
  ```
- **Response**: `200 OK` (Project Schema)

### `GET /projects`
List recent projects. Query params: `skip` (default 0), `limit` (default 50).

### `GET /projects/{project_id}`
Returns project details, associated media assets, transcript segments, and background jobs.

### `PUT /projects/{project_id}`
Updates project title, language settings, or configuration flags.

### `DELETE /projects/{project_id}`
Deletes the project database record and permanently wipes all source and processed media from disk.

### `POST /projects/{project_id}/upload`
Uploads a video file (multipart form data).
- Validates file format against whitelist (`.mp4`, `.mov`, `.webm`, `.mkv`).
- Validates file size (limit: 250 MB).
- Validates video duration via FFmpeg / FFprobe.
- Stores file under private UUID token.

---

## 2. Languages & Voices API

### `GET /languages`
Returns the verified language registry with scripts, directions (LTR/RTL), and supported pipeline capabilities.

### `POST /languages/compatibility`
Validates compatibility for a source and target language pair.
- **Request Body**:
  ```json
  {
    "source_language": "en",
    "target_language": "ur",
    "voice_replication_requested": false
  }
  ```

### `GET /voices?language_code=hi`
Returns verified neural voice models for the specified language with gender, description, and preview parameters.

### `POST /voices/projects/{project_id}/configure`
Assigns the selected voice model, speech speed, pitch, and gain to a project.

### `POST /voices/projects/{project_id}/consent`
Records legally required consent for original speaker voice replication.
- **Request Body**:
  ```json
  {
    "speaker_name": "Speaker Name",
    "consent_statement": "I affirm that I have permission...",
    "has_explicit_permission": true
  }
  ```

---

## 3. Transcription & Translation API

### `POST /projects/{project_id}/transcription`
Starts background audio extraction, speech transcription, and initial translation into the target language.

### `GET /projects/{project_id}/transcript`
Returns list of timestamped transcript segments for review.

### `PUT /projects/{project_id}/transcript`
Bulk updates edited translations and timing adjustments.

### `PUT /projects/{project_id}/transcript/{segment_id}`
Updates a single segment's translated text, speaker tag, or approved flag.

---

## 4. Dubbing & Rendering API

### `POST /projects/{project_id}/dub`
Starts speech synthesis, audio alignment, background ducking, subtitle generation, and video multiplexing.

---

## 5. Job Queue & Lifecycle API

### `GET /jobs/{job_id}`
Returns live status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), current stage, and progress (0-100%).

### `POST /jobs/{job_id}/cancel`
Cancels an active background task.

### `POST /jobs/{job_id}/retry`
Retries a failed or cancelled job.

---

## 6. Downloads API

### `GET /projects/{project_id}/downloads/{asset_type}`
Downloads media files:
- `video`: Final dubbed MP4
- `source_video`: Original uploaded video
- `subtitles_srt`: SRT format
- `subtitles_vtt`: WebVTT format
- `transcript_txt`: Translated transcript text file
- `source_transcript_txt`: Original source speech text file

---

## 7. Usage & Cost Metrics API

### `GET /usage/stats`
Returns total projects, completed projects, duration processed, estimated costs, and service health status.
