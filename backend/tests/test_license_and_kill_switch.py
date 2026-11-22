import pytest
from app.db.session import SessionLocal
from app.db.models import ClientLicense, SystemAccessConfig
from app.services.access_manager import AccessManager


def test_license_generation_and_revocation():
    db = SessionLocal()
    try:
        # 1. Generate license key
        client_name = "Test Agency"
        key = AccessManager.generate_license_key(client_name)
        assert "GDUB-TESTAG" in key or "GDUB-" in key

        lic = ClientLicense(
            license_key=key,
            client_name=client_name,
            status="active",
            is_active=True,
        )
        db.add(lic)
        db.commit()
        db.refresh(lic)

        # 2. Check access when active
        res_active = AccessManager.validate_access(db, key)
        assert res_active["allowed"] is True
        assert res_active["client_name"] == client_name

        # 3. 1-Click Revocation
        lic.status = "revoked"
        lic.is_active = False
        db.commit()

        # 4. Check access after revocation
        res_revoked = AccessManager.validate_access(db, key)
        assert res_revoked["allowed"] is False
        assert res_revoked["reason"] == "revoked"
        assert "revoke" in res_revoked["message"].lower()

        # 5. Restore access
        lic.status = "active"
        lic.is_active = True
        db.commit()

        res_restored = AccessManager.validate_access(db, key)
        assert res_restored["allowed"] is True

        # Clean up
        db.delete(lic)
        db.commit()
    finally:
        db.close()


def test_master_global_kill_switch():
    db = SessionLocal()
    try:
        cfg = AccessManager.get_or_create_config(db)
        original_state = cfg.is_global_locked

        # Lock entire tool
        cfg.is_global_locked = True
        db.commit()

        res_locked = AccessManager.validate_access(db)
        assert res_locked["allowed"] is False
        assert res_locked["reason"] == "global_lock"
        assert res_locked["is_locked"] is True

        # Unlock tool
        cfg.is_global_locked = False
        db.commit()

        res_unlocked = AccessManager.validate_access(db)
        # Should not be blocked by global lock
        assert res_unlocked.get("reason") != "global_lock"

        # Restore original state
        cfg.is_global_locked = original_state
        db.commit()
    finally:
        db.close()


def test_api_access_endpoints(client):
    # Test public status endpoint
    resp = client.get("/api/v1/access/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "allowed" in data

    # Test admin login with default password
    login_resp = client.post("/api/v1/access/admin/login", json={"password": "admin123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    assert token is not None

    # Test create client license via admin API
    headers = {"X-Admin-Key": token}
    create_resp = client.post(
        "/api/v1/access/admin/licenses",
        json={"client_name": "API Test Client", "expires_in_days": 30},
        headers=headers,
    )
    assert create_resp.status_code == 200
    lic_data = create_resp.json()
    lic_id = lic_data["id"]
    lic_key = lic_data["license_key"]
    assert lic_data["status"] == "active"

    # Verify key works
    verify_resp = client.post("/api/v1/access/verify-key", json={"license_key": lic_key})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["allowed"] is True

    # Revoke license in 1-click
    revoke_resp = client.post(f"/api/v1/access/admin/licenses/{lic_id}/revoke", headers=headers)
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["status"] == "revoked"

    # Verify key is now blocked
    verify_after = client.post("/api/v1/access/verify-key", json={"license_key": lic_key})
    assert verify_after.status_code == 200
    assert verify_after.json()["allowed"] is False
    assert verify_after.json()["reason"] == "revoked"

    # Test project creation with revoked key receives 403 Forbidden
    proj_resp = client.post(
        "/api/v1/projects",
        json={"name": "Blocked Project", "source_language": "en", "target_language": "ur"},
        headers={"X-License-Key": lic_key},
    )
    assert proj_resp.status_code == 403
    assert "revoke" in proj_resp.json()["detail"].lower()

    # Clean up license
    del_resp = client.delete(f"/api/v1/access/admin/licenses/{lic_id}", headers=headers)
    assert del_resp.status_code == 200
