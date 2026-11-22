import pytest
from app.db.models import Project, TranscriptSegment


def test_transcript_editing_flow(client, db_session):
    # 1. Create project directly in DB
    proj = Project(
        name="Transcript Test Project",
        source_language="en",
        target_language="hi",
        status="AWAITING_REVIEW"
    )
    db_session.add(proj)
    db_session.commit()
    db_session.refresh(proj)

    seg = TranscriptSegment(
        project_id=proj.id,
        speaker_id="Speaker 1",
        start_time=0.0,
        end_time=3.5,
        source_text="This is an automated speech line.",
        translated_text="यह एक स्वचालित वाणी पंक्ति है।",
        is_approved=True,
    )
    db_session.add(seg)
    db_session.commit()
    db_session.refresh(seg)

    # 2. Query via API
    res = client.get(f"/api/v1/projects/{proj.id}/transcript")
    assert res.status_code == 200
    segments = res.json()
    assert len(segments) == 1
    assert segments[0]["id"] == seg.id

    # 3. User edits the translated text
    edit_res = client.put(
        f"/api/v1/projects/{proj.id}/transcript/{seg.id}",
        json={"translated_text": "यह एक उपयोगकर्ता द्वारा संपादित पंक्ति है।"}
    )
    assert edit_res.status_code == 200
    edited = edit_res.json()
    assert edited["translated_text"] == "यह एक उपयोगकर्ता द्वारा संपादित पंक्ति है।"
    assert edited["edit_version"] >= 2
