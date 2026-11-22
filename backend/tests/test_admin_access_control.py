import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db

init_db()
client = TestClient(app)


def test_admin_stats():
    """Verify admin stats endpoint returns platform metrics."""
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "suspended_users" in data
    assert data["total_users"] >= 1
    assert data["system_status"] == "healthy"


def test_admin_list_users():
    """Verify listing users and filtering by role/status/search."""
    res = client.get("/api/v1/admin/users")
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 1

    # Search by admin
    search_res = client.get("/api/v1/admin/users?search=admin")
    assert search_res.status_code == 200
    search_users = search_res.json()
    assert any(u["role"] == "admin" for u in search_users)


def test_admin_create_and_access_control():
    """Verify creating a user and granularly controlling their access."""
    # 1. Create a new test user
    payload = {
        "email": "access_test_user@example.com",
        "username": "access_tester",
        "full_name": "Access Control Tester",
        "role": "user",
        "status": "active",
        "is_active": True,
        "can_ai_dubbing": True,
        "can_voice_over": True,
        "can_clone_voice": False,
        "can_export_subtitles": True,
        "can_burn_subtitles": True,
        "tier": "free",
        "max_video_duration_minutes": 25,
        "monthly_minutes_quota": 90
    }
    create_res = client.post("/api/v1/admin/users", json=payload)
    assert create_res.status_code in [200, 201]
    user = create_res.json()
    user_id = user["id"]
    assert user["email"] == "access_test_user@example.com"
    assert user["can_ai_dubbing"] is True

    # 2. Granular access control: Disable AI Dubbing & reduce quota
    patch_res = client.patch(
        f"/api/v1/admin/users/{user_id}/access",
        json={
            "can_ai_dubbing": False,
            "monthly_minutes_quota": 50,
            "tier": "pro"
        }
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["can_ai_dubbing"] is False
    assert updated["monthly_minutes_quota"] == 50
    assert updated["tier"] == "pro"

    # 3. 1-Click Toggle Status (Suspend User)
    toggle_res = client.post(f"/api/v1/admin/users/{user_id}/toggle-status")
    assert toggle_res.status_code == 200
    toggled = toggle_res.json()
    assert toggled["is_active"] is False
    assert toggled["status"] == "suspended"

    # 4. Toggle back to active
    toggle_back_res = client.post(f"/api/v1/admin/users/{user_id}/toggle-status")
    assert toggle_back_res.status_code == 200
    toggled_back = toggle_back_res.json()
    assert toggled_back["is_active"] is True
    assert toggled_back["status"] == "active"

    # 5. Delete test user
    del_res = client.delete(f"/api/v1/admin/users/{user_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 6. Verify user is gone
    get_res = client.get(f"/api/v1/admin/users/{user_id}")
    assert get_res.status_code == 404
