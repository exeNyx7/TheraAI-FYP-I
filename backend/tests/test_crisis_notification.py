"""
Tests for CrisisService.record_crisis_event fallback delivery.

Verifies that even with MAIL_ENABLED=False a crisis event:
  - Creates a record in crisis_events
  - Creates a record in escalations
  - Creates a record in notifications (for therapist / admin)
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_db(
    patient_doc=None,
    therapist_doc=None,
    appointment_doc=None,
    admin_doc=None,
):
    """Return a minimal mock DB with the collections used by record_crisis_event."""
    db = MagicMock()

    # crisis_events
    db.crisis_events = MagicMock()
    db.crisis_events.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    # escalations
    db.escalations = MagicMock()
    db.escalations.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    # notifications
    db.notifications = MagicMock()
    db.notifications.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    # users — find_one cycles through: patient, therapist, admin
    _patient = patient_doc or {
        "_id": ObjectId(),
        "full_name": "Test Patient",
        "email": "patient@test.com",
        "role": "patient",
    }
    _therapist = therapist_doc or {
        "_id": ObjectId(),
        "full_name": "Dr. Test",
        "email": "therapist@test.com",
        "role": "psychiatrist",
    }
    _admin = admin_doc or {
        "_id": ObjectId(),
        "full_name": "Admin",
        "email": "admin@test.com",
        "role": "admin",
    }

    async def _users_find_one(query, *args, **kwargs):
        if "_id" in query:
            oid = query["_id"]
            if oid == _patient["_id"]:
                return _patient
            if oid == _therapist["_id"]:
                return _therapist
            return None
        if query.get("role") == "admin":
            return _admin
        return _patient

    db.users = MagicMock()
    db.users.find_one = AsyncMock(side_effect=_users_find_one)

    # appointments
    _appt = appointment_doc
    db.appointments = MagicMock()
    db.appointments.find_one = AsyncMock(return_value=_appt)

    return db, str(_patient["_id"]), str(_therapist["_id"])


def _make_settings(mail_enabled=False, demo_mode=False):
    s = MagicMock()
    s.mail_enabled = mail_enabled
    s.demo_mode = demo_mode
    s.admin_email = "admin@test.com"
    return s


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_crisis_creates_escalation_and_notification_no_email():
    """MAIL_ENABLED=False → escalation + notification still created."""
    db, patient_id, therapist_id = _make_db()

    therapist_oid = ObjectId(therapist_id)
    appt = {
        "_id": ObjectId(),
        "patient_id": patient_id,
        "therapist_id": therapist_oid,
        "status": "confirmed",
    }
    db.appointments.find_one = AsyncMock(return_value=appt)
    db.users.find_one = AsyncMock(side_effect=lambda q, *a, **kw: _resolve_user(q, patient_id, therapist_id))

    settings = _make_settings(mail_enabled=False)

    from app.services.crisis_service import CrisisService

    with (
        patch("app.services.crisis_service.get_database", AsyncMock(return_value=db)),
        patch("app.services.crisis_service.get_settings", return_value=settings),
    ):
        await CrisisService.record_crisis_event(
            user_id=patient_id,
            message="I want to kill myself",
            severity="emergency",
            keywords_matched=["kill myself"],
        )

    db.crisis_events.insert_one.assert_awaited_once()
    db.escalations.insert_one.assert_awaited_once()
    db.notifications.insert_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_crisis_no_therapist_falls_back_to_admin():
    """No appointment found → notification goes to admin."""
    db, patient_id, _ = _make_db(appointment_doc=None)

    settings = _make_settings(mail_enabled=False)

    from app.services.crisis_service import CrisisService

    with (
        patch("app.services.crisis_service.get_database", AsyncMock(return_value=db)),
        patch("app.services.crisis_service.get_settings", return_value=settings),
    ):
        await CrisisService.record_crisis_event(
            user_id=patient_id,
            message="I can't go on",
            severity="high",
            keywords_matched=["can't go on"],
        )

    db.crisis_events.insert_one.assert_awaited_once()
    db.escalations.insert_one.assert_awaited_once()
    db.notifications.insert_one.assert_awaited_once()

    notif_doc = db.notifications.insert_one.call_args[0][0]
    assert notif_doc["type"] == "crisis_alert"
    assert notif_doc["severity"] == "high"


@pytest.mark.asyncio
async def test_crisis_escalation_doc_fields():
    """Escalation document has expected fields."""
    db, patient_id, _ = _make_db()
    settings = _make_settings(mail_enabled=False)

    from app.services.crisis_service import CrisisService

    with (
        patch("app.services.crisis_service.get_database", AsyncMock(return_value=db)),
        patch("app.services.crisis_service.get_settings", return_value=settings),
    ):
        await CrisisService.record_crisis_event(
            user_id=patient_id,
            message="feeling hopeless",
            severity="moderate",
            keywords_matched=["hopeless"],
        )

    esc_doc = db.escalations.insert_one.call_args[0][0]
    assert esc_doc["patient_id"] == patient_id
    assert esc_doc["severity"] == "moderate"
    assert esc_doc["triggered_by"] == "ai_crisis_detection"
    assert esc_doc["status"] == "open"
    assert esc_doc["acknowledged"] is False


@pytest.mark.asyncio
async def test_crisis_email_NOT_sent_when_disabled():
    """EmailService.send_crisis_alert is never called when MAIL_ENABLED=False."""
    db, patient_id, _ = _make_db()
    settings = _make_settings(mail_enabled=False)

    from app.services.crisis_service import CrisisService

    with (
        patch("app.services.crisis_service.get_database", AsyncMock(return_value=db)),
        patch("app.services.crisis_service.get_settings", return_value=settings),
        patch("app.services.email_service.EmailService.send_crisis_alert") as mock_email,
    ):
        await CrisisService.record_crisis_event(
            user_id=patient_id,
            message="I want to end my life",
            severity="emergency",
        )

    mock_email.assert_not_called()


@pytest.mark.asyncio
async def test_demo_mode_prints_to_console(capsys):
    """DEMO_MODE=True produces bright-red console output."""
    db, patient_id, _ = _make_db()
    settings = _make_settings(mail_enabled=False, demo_mode=True)

    from app.services.crisis_service import CrisisService

    with (
        patch("app.services.crisis_service.get_database", AsyncMock(return_value=db)),
        patch("app.services.crisis_service.get_settings", return_value=settings),
    ):
        await CrisisService.record_crisis_event(
            user_id=patient_id,
            message="I want to die",
            severity="emergency",
            keywords_matched=["want to die"],
        )

    captured = capsys.readouterr()
    assert "CRISIS ALERT" in captured.out
    assert "EMERGENCY" in captured.out.upper()


# ─────────────────────────────────────────────────────────────────────────────
# Helper used by some tests
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_user(query, patient_id, therapist_id):
    from bson import ObjectId
    if "_id" in query:
        oid = str(query["_id"])
        if oid == patient_id:
            return {"_id": ObjectId(patient_id), "full_name": "Test Patient", "email": "p@t.com"}
        if oid == therapist_id:
            return {"_id": ObjectId(therapist_id), "full_name": "Dr. Test", "email": "t@t.com"}
    if query.get("role") == "admin":
        return {"_id": ObjectId(), "full_name": "Admin", "email": "a@t.com"}
    return None
