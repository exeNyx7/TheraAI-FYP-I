"""
Tests for the Calls API (/api/v1/calls/room).
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token, hash_password


def _headers(user_id: str, role: str = "patient") -> dict:
    token = create_access_token(
        data={"sub": user_id, "role": role},
        expires_delta=timedelta(minutes=30),
    )
    return {"Authorization": f"Bearer {token}"}


PATIENT_ID = str(ObjectId())
THERAPIST_ID = str(ObjectId())
APPT_ID = str(ObjectId())


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestCallsRoom:
    @pytest.mark.asyncio
    async def test_room_requires_auth(self, client):
        resp = await client.post("/api/v1/calls/room", json={"appointment_id": APPT_ID})
        assert resp.status_code in (401, 403)  # 401 from HTTPBearer missing creds

    @pytest.mark.asyncio
    async def test_room_returns_jitsi_url(self, client, monkeypatch):
        appt_doc = {
            "_id": ObjectId(APPT_ID),
            "patient_id": PATIENT_ID,
            "therapist_id": THERAPIST_ID,
            "status": "scheduled",
            "jitsi_room_name": None,
        }

        mock_db = MagicMock()
        mock_db.appointments.find_one = AsyncMock(return_value=appt_doc)
        mock_db.appointments.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

        patient_doc = {
            "_id": ObjectId(PATIENT_ID),
            "email": "p@test.com", "full_name": "Patient",
            "role": "patient", "is_active": True,
            "hashed_password": hash_password("Test1234!"),
            "created_at": datetime.now(timezone.utc),
            "onboarding_completed": True,
            "xp": 0, "level": 1, "streak_days": 0,
            "unlocked_achievements": [], "notification_preferences": {},
            "privacy_settings": {}, "theme": "system",
        }
        mock_db.users.find_one = AsyncMock(return_value=patient_doc)

        monkeypatch.setattr("app.database.get_database", AsyncMock(return_value=mock_db))
        monkeypatch.setattr("app.database.db_manager.get_database", lambda: mock_db)

        from app.dependencies.auth import _user_cache
        _user_cache.clear()

        # Patch get_current_user to return the patient
        from app.models.user import UserOut
        patient_out = UserOut(**{**patient_doc, "_id": PATIENT_ID, "id": PATIENT_ID})

        monkeypatch.setattr(
            "app.dependencies.auth.UserService.get_user_by_id",
            AsyncMock(return_value=patient_out)
        )

        resp = await client.post(
            "/api/v1/calls/room",
            json={"appointment_id": APPT_ID},
            headers=_headers(PATIENT_ID, "patient"),
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "jitsi_url" in data
        assert "theraai-" in data["jitsi_url"]
        assert data["appointment_id"] == APPT_ID

    @pytest.mark.asyncio
    async def test_room_invalid_appointment_id(self, client, monkeypatch):
        patient_doc = {
            "_id": ObjectId(PATIENT_ID),
            "email": "p@test.com", "full_name": "Patient",
            "role": "patient", "is_active": True,
            "hashed_password": hash_password("Test1234!"),
            "created_at": datetime.now(timezone.utc),
            "onboarding_completed": True,
            "xp": 0, "level": 1, "streak_days": 0,
            "unlocked_achievements": [], "notification_preferences": {},
            "privacy_settings": {}, "theme": "system",
        }

        mock_db = MagicMock()
        mock_db.users.find_one = AsyncMock(return_value=patient_doc)

        monkeypatch.setattr("app.database.get_database", AsyncMock(return_value=mock_db))
        monkeypatch.setattr("app.database.db_manager.get_database", lambda: mock_db)

        from app.dependencies.auth import _user_cache
        _user_cache.clear()

        from app.models.user import UserOut
        patient_out = UserOut(**{**patient_doc, "_id": PATIENT_ID, "id": PATIENT_ID})
        monkeypatch.setattr(
            "app.dependencies.auth.UserService.get_user_by_id",
            AsyncMock(return_value=patient_out)
        )

        resp = await client.post(
            "/api/v1/calls/room",
            json={"appointment_id": "not-a-valid-id"},
            headers=_headers(PATIENT_ID, "patient"),
        )
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_non_participant_cannot_join(self, client, monkeypatch):
        outsider_id = str(ObjectId())
        appt_doc = {
            "_id": ObjectId(APPT_ID),
            "patient_id": PATIENT_ID,
            "therapist_id": THERAPIST_ID,
            "status": "scheduled",
        }

        outsider_doc = {
            "_id": ObjectId(outsider_id),
            "email": "outsider@test.com", "full_name": "Outsider",
            "role": "patient", "is_active": True,
            "hashed_password": hash_password("Test1234!"),
            "created_at": datetime.now(timezone.utc),
            "onboarding_completed": True,
            "xp": 0, "level": 1, "streak_days": 0,
            "unlocked_achievements": [], "notification_preferences": {},
            "privacy_settings": {}, "theme": "system",
        }

        mock_db = MagicMock()
        mock_db.appointments.find_one = AsyncMock(return_value=appt_doc)
        mock_db.users.find_one = AsyncMock(return_value={**outsider_doc, "role": "patient"})

        monkeypatch.setattr("app.database.get_database", AsyncMock(return_value=mock_db))
        monkeypatch.setattr("app.database.db_manager.get_database", lambda: mock_db)

        from app.dependencies.auth import _user_cache
        _user_cache.clear()

        from app.models.user import UserOut
        outsider_out = UserOut(**{**outsider_doc, "_id": outsider_id, "id": outsider_id})
        monkeypatch.setattr(
            "app.dependencies.auth.UserService.get_user_by_id",
            AsyncMock(return_value=outsider_out)
        )

        resp = await client.post(
            "/api/v1/calls/room",
            json={"appointment_id": APPT_ID},
            headers=_headers(outsider_id, "patient"),
        )
        assert resp.status_code == 403
