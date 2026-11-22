import subprocess
import pytest
from pathlib import Path
from app.config import settings
from app.services.media_inspector import MediaInspector
from app.workers.pipeline import run_transcription_pipeline, run_dubbing_pipeline
from app.db.models import Project, ProcessingJob


def create_synthetic_test_video(output_path: Path, duration_sec: int = 4) -> Path:
    """Generate a synthetic MP4 video fixture with color bars and a test tone."""
    cmd = [
        settings.FFMPEG_PATH,
        "-y",
        "-f", "lavfi",
        "-i", f"testsrc=duration={duration_sec}:size=640x360:rate=24",
        "-f", "lavfi",
        "-i", f"sine=frequency=440:duration={duration_sec}",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-pix_fmt", "yuv420p",
        str(output_path)
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return output_path


def test_end_to_end_synthetic_dubbing(client, db_session, tmp_path):
    import asyncio
    asyncio.run(_async_test_end_to_end(client, db_session, tmp_path))


async def _async_test_end_to_end(client, db_session, tmp_path):
    # 1. Create synthetic fixture
    fixture_mp4 = tmp_path / "synthetic_input.mp4"
    create_synthetic_test_video(fixture_mp4, duration_sec=3)
    assert fixture_mp4.exists()

    # 2. Inspect fixture
    inspector = MediaInspector()
    meta = inspector.inspect(fixture_mp4)
    assert meta.duration >= 2.5
    assert meta.width == 640
    assert meta.height == 360

    # 3. Create project via API
    create_res = client.post("/api/v1/projects", json={
        "name": "Synthetic E2E Dub",
        "source_language": "en",
        "target_language": "hi",
        "settings": {
            "background_audio_enabled": True,
            "original_audio_volume": 0.1,
            "dubbed_speech_volume": 1.0,
            "burn_subtitles": False
        }
    })
    assert create_res.status_code == 200
    project_id = create_res.json()["id"]

    # 4. Upload video fixture
    with open(fixture_mp4, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{project_id}/upload",
            files={"file": ("test_vid.mp4", f, "video/mp4")}
        )
    assert upload_res.status_code == 200
    assert upload_res.json()["duration"] >= 2.5

    # 5. Run transcription pipeline
    job1 = ProcessingJob(
        project_id=project_id,
        stage="QUEUED",
        status="RUNNING"
    )
    db_session.add(job1)
    db_session.commit()
    db_session.refresh(job1)

    await run_transcription_pipeline(job1.id, project_id)

    # Verify segments created
    segments_res = client.get(f"/api/v1/projects/{project_id}/transcript")
    assert segments_res.status_code == 200
    segments = segments_res.json()
    assert len(segments) >= 1
    assert segments[0]["translated_text"] is not None

    # 6. Run dubbing pipeline
    job2 = ProcessingJob(
        project_id=project_id,
        stage="QUEUED",
        status="RUNNING"
    )
    db_session.add(job2)
    db_session.commit()
    db_session.refresh(job2)

    await run_dubbing_pipeline(job2.id, project_id)

    # 7. Check final project status
    proj_res = client.get(f"/api/v1/projects/{project_id}")
    assert proj_res.status_code == 200
    proj_data = proj_res.json()
    assert proj_data["status"] == "COMPLETED"

    # 8. Test download endpoints
    dl_video = client.get(f"/api/v1/projects/{project_id}/downloads/video")
    assert dl_video.status_code == 200
    assert dl_video.headers["content-type"] == "video/mp4"
    assert len(dl_video.content) > 1000

    dl_srt = client.get(f"/api/v1/projects/{project_id}/downloads/subtitles_srt")
    assert dl_srt.status_code == 200
    assert "-->" in dl_srt.text

    dl_vtt = client.get(f"/api/v1/projects/{project_id}/downloads/subtitles_vtt")
    assert dl_vtt.status_code == 200
    assert "WEBVTT" in dl_vtt.text
