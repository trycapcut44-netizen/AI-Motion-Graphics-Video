import io
import pytest
from app.config import settings


def test_create_project_and_validation(client):
    res = client.post("/api/v1/projects", json={
        "name": "Integration Test Project",
        "source_language": "en",
        "target_language": "hi",
        "settings": {
            "background_audio_enabled": True,
            "original_audio_volume": 0.2
        }
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Integration Test Project"
    assert data["target_language"] == "hi"
    assert data["status"] == "DRAFT"
    project_id = data["id"]

    # Reject unsupported file extension (.exe or .txt)
    fake_txt = io.BytesIO(b"Hello world this is not video")
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/upload",
        files={"file": ("malicious.exe", fake_txt, "application/octet-stream")}
    )
    assert upload_res.status_code == 400
    assert "Unsupported media format" in upload_res.json()["detail"]


def test_path_traversal_sanitization(client, tmp_path):
    # Ensure filename with path traversal is not written outside uploads
    res = client.post("/api/v1/projects", json={
        "name": "Traversal Test",
        "source_language": "auto",
        "target_language": "ur"
    })
    project_id = res.json()["id"]

    traversal_name = "../../../../etc/passwd.mp4"
    fake_content = io.BytesIO(b"invalid header")
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/upload",
        files={"file": (traversal_name, fake_content, "video/mp4")}
    )
    # The inspector will fail because it's not a real mp4, but notice no file escaped the uploads dir
    assert upload_res.status_code == 400
    assert not (settings.STORAGE_DIR.parent / "passwd.mp4").exists()
