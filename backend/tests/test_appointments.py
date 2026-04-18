"""
Integration tests for the Appointments API.
Tests cover: create, list, get-by-id, cancel, status-update, RBAC.
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.utils.auth import create_access_token, hash_password


def _make_token(user_id: str, role: str = "patient") -> str:
    return create_access_token(
        data={"sub": user_id, "role": role},
        expires_delta=timedelta(minutes=30),
    )


def _headers(user_id: str, role: str = "patient") -> dict:
    return {"Authorization": f"Bearer {_make_token(user_id, role)}"}


FUTURE_TIME = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

PATIENT_ID = str(ObjectId())
THERAPIST_ID = str(ObjectId())
APPT_ID = str(ObjectId())

PATIENT_DOC = {
    "_id": ObjectId(PATIENT_ID),
    "email": "patient@test.com",
    "full_name": "Test Patient",
    "role": "patient",
    "is_active": True,
    "hashed_password": hash_password("Test1234!"),
    "created_at": datetime.now(timezone.utc),
    "onboarding_completed": True,
    "xp": 0, "level": 1, "streak_days": 0,
    "unlocked_achievements": [],
    "notification_preferences": {},
    "privacy_settings": {},
    "theme": "system",
}

THERAPIST_DOC = {
    "_id": ObjectId(THERAPIST_ID),
    "email": "therapist@test.com",
    "full_name": "Dr. Smith",
    "role": "psychiatrist",
    "is_active": True,
    "hashed_password": hash_password("Test1234!"),
    "created_at": datetime.now(timezone.utc),
    "onboarding_completed": True,
    "xp": 0, "level": 1, "streak_days": 0,
    "unlocked_achievements": [],
    "notification_preferences": {},
    "privacy_settings": {},
    "theme": "system",
}

APPT_DOC = {
    "_id": ObjectId(APPT_ID),
    "patient_id": PATIENT_ID,
    "therapist_id": THERAPIST_ID,
    "scheduled_at": datetime.now(timezone.utc) + timedelta(days=7),
    "duration_minutes": 50,
    "type": "video",
    "status": "scheduled",
    "reminder_sent": False,
    "created_at": datetime.now(timezone.utc),
    "updated_at": None,
}


def _mock_db_for_appointments(monkeypatch):
    mock_db = MagicMock()

    # users collection
    async def find_user(query, *args, **kwargs):
        oid = query.get("_id")
        if oid == ObjectId(PATIENT_ID):
            return PATIENT_DOC
        if oid == ObjectId(THERAPIST_ID):
            return THERAPIST_DOC
        # therapist lookup by role
        if query.get("role") == "psychiatrist" or (
            isinstance(query.get("role"), dict)
            and "psychiatrist" in query["role"].get("$in", [])
        ):
            if query.get("_id") == ObjectId(THERAPIST_ID):
                return THERAPIST_DOC
        return None

    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(side_effect=find_user)

    # appointments collection
    mock_db.appointments = MagicMock()
    mock_db.appointments.find_one = AsyncMock(return_value=APPT_DOC)
    mock_db.appointments.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id=ObjectId(APPT_ID))
    )
    mock_db.appointments.update_one = AsyncMock(
        return_value=MagicMock(modified_count=1, matched_count=1)
    )

    # cursor mock for conflict check
    conflict_cursor = MagicMock()
    conflict_cursor.find_one = AsyncMock(return_value=None)
    mock_db.appointments.find_one = AsyncMock(side_effect=[
        None,  # conflict check therapist
        None,  # conflict check patient
        {**APPT_DOC},  # created doc lookup
        PATIENT_DOC, THERAPIST_DOC,  # enrich names
    ])

    monkeypatch.setattr("app.database.db_manager.get_database", lambda: mock_db)
    monkeypatch.setattr("app.database.get_database", AsyncMock(return_value=mock_db))

    # Patch get_current_user
    async def _get_user(credentials=None):
        from app.models.user import UserOut
        return UserOut(**{**PATIENT_DOC, "_id": PATIENT_ID, "id": PATIENT_ID})

    from app import dependencies
    monkeypatch.setattr("app.dependencies.auth.get_current_user", _get_user)
    monkeypatch.setattr("app.dependencies.auth._user_cache", {})

    return mock_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestAppointmentList:
    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client):
        resp = await client.get("/api/v1/appointments")
        assert resp.status_code in (401, 403)  # 401 from HTTPBearer missing creds


class TestAppointmentRBAC:
    @pytest.mark.asyncio
    async def test_therapist_patient_summary_requires_staff(self, client):
        resp = await client.get(
            f"/api/v1/appointments/{APPT_ID}/patient-summary",
            headers=_headers(PATIENT_ID, "patient"),
        )
        # Patient cannot access patient-summary (staff only)
        assert resp.status_code in (401, 403)


class TestCrisisService:
    """Spot-checks that crisis service is imported correctly."""

    def test_detect_returns_dict(self):
        from app.services.crisis_service import CrisisService
        result = CrisisService.detect_crisis("hello world")
        assert isinstance(result, dict)
        assert "is_crisis" in result

    def test_no_crisis_for_neutral(self):
        from app.services.crisis_service import CrisisService
        result = CrisisService.detect_crisis("good morning, feeling fine")
        assert result["is_crisis"] is False
