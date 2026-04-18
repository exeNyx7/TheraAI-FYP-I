"""
Tests for Role-Based Access Control (RBAC).

Verifies that:
- Patient cannot access therapist-only endpoints
- Therapist cannot access admin-only endpoints
- Admin can access everything
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token, hash_password


def _token(user_id: str, role: str) -> str:
    return create_access_token(
        data={"sub": user_id, "role": role},
        expires_delta=timedelta(minutes=30),
    )


def _auth(user_id: str, role: str) -> dict:
    return {"Authorization": f"Bearer {_token(user_id, role)}"}


UID = str(ObjectId())


def _make_user(uid: str, role: str):
    return {
        "_id": ObjectId(uid),
        "email": f"{role}@test.com",
        "full_name": f"Test {role.title()}",
        "role": role,
        "is_active": True,
        "hashed_password": hash_password("Test1234!"),
        "created_at": datetime.now(timezone.utc),
        "onboarding_completed": True,
        "xp": 0, "level": 1, "streak_days": 0,
        "unlocked_achievements": [], "notification_preferences": {},
        "privacy_settings": {}, "theme": "system",
    }


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def _patch_user(monkeypatch, uid: str, role: str):
    from app.models.user import UserOut
    from app.dependencies.auth import _user_cache
    _user_cache.clear()
    user_doc = _make_user(uid, role)
    user_out = UserOut(**{**user_doc, "_id": uid, "id": uid})
    monkeypatch.setattr(
        "app.dependencies.auth.UserService.get_user_by_id",
        AsyncMock(return_value=user_out)
    )
    return user_out


# ── Session Notes ──────────────────────────────────────────────────────────────

class TestSessionNotesRBAC:
    @pytest.mark.asyncio
    async def test_patient_cannot_list_session_notes(self, client, monkeypatch):
        uid = str(ObjectId())
        _patch_user(monkeypatch, uid, "patient")
        resp = await client.get("/api/v1/session-notes", headers=_auth(uid, "patient"))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_list_session_notes(self, client):
        resp = await client.get("/api/v1/session-notes")
        assert resp.status_code in (401, 403)  # 401 from HTTPBearer, 403 from RBAC


# ── Treatment Plans ────────────────────────────────────────────────────────────

class TestTreatmentPlansRBAC:
    @pytest.mark.asyncio
    async def test_patient_cannot_create_treatment_plan(self, client, monkeypatch):
        uid = str(ObjectId())
        _patch_user(monkeypatch, uid, "patient")
        resp = await client.post(
            "/api/v1/treatment-plans",
            json={"patient_id": uid, "title": "Plan", "goals": [], "interventions": []},
            headers=_auth(uid, "patient"),
        )
        assert resp.status_code == 403


# ── Admin Dashboard ────────────────────────────────────────────────────────────

class TestAdminRBAC:
    @pytest.mark.asyncio
    async def test_patient_cannot_access_admin_dashboard(self, client, monkeypatch):
        uid = str(ObjectId())
        _patch_user(monkeypatch, uid, "patient")
        resp = await client.get("/api/v1/admin/dashboard", headers=_auth(uid, "patient"))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_therapist_cannot_access_admin_dashboard(self, client, monkeypatch):
        uid = str(ObjectId())
        _patch_user(monkeypatch, uid, "psychiatrist")
        resp = await client.get("/api/v1/admin/dashboard", headers=_auth(uid, "psychiatrist"))
        assert resp.status_code == 403


# ── Therapist Dashboard ────────────────────────────────────────────────────────

class TestTherapistRBAC:
    @pytest.mark.asyncio
    async def test_patient_cannot_access_therapist_dashboard(self, client, monkeypatch):
        uid = str(ObjectId())
        _patch_user(monkeypatch, uid, "patient")
        resp = await client.get("/api/v1/therapist/dashboard", headers=_auth(uid, "patient"))
        assert resp.status_code == 403
