"""
Scheduler Service for TheraAI
Schedules appointment reminders (T-15m / T-5m / T-0) using asyncio background tasks.
No extra dependencies required — relies on asyncio.create_task + asyncio.sleep.
Tasks are best-effort: if the FastAPI process restarts, pending reminders are lost.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from ..database import get_database
from .email_service import EmailService

logger = logging.getLogger(__name__)

REMINDER_OFFSETS = [
    (15 * 60, "reminder_15m", "Your session starts in 15 minutes"),
    (5 * 60, "reminder_5m", "Your session starts in 5 minutes"),
    (0, "session_starting", "Your session is starting now"),
]


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


async def _insert_notification(
    db,
    user_id: str,
    n_type: str,
    title: str,
    body: str,
    appointment_id: Optional[str] = None,
) -> None:
    try:
        await db.notifications.insert_one(
            {
                "user_id": str(user_id),
                "type": n_type,
                "title": title,
                "body": body,
                "appointment_id": appointment_id,
                "read": False,
                "created_at": _now_utc(),
            }
        )
    except Exception as e:
        logger.error(f"_insert_notification failed: {e}")


async def _lookup_user(db, user_id: str) -> dict:
    try:
        doc = await db.users.find_one({"_id": ObjectId(user_id)})
        return doc or {}
    except Exception:
        return {}


async def _delayed_reminder(
    appointment_id: str,
    delay_seconds: float,
    n_type: str,
    title: str,
    patient_id: str,
    therapist_id: str,
) -> None:
    try:
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        db = await get_database()

        # Verify appointment still exists & is not cancelled
        try:
            appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
            if not appt or appt.get("status") == "cancelled":
                return
        except Exception:
            return

        body = f"{title}."
        await _insert_notification(db, patient_id, n_type, title, body, appointment_id)
        await _insert_notification(db, therapist_id, n_type, title, body, appointment_id)

        # Fire-and-forget email for 15m reminder only (avoid spam)
        if n_type == "reminder_15m":
            try:
                patient = await _lookup_user(db, patient_id)
                therapist = await _lookup_user(db, therapist_id)
                p_email = patient.get("email")
                t_email = therapist.get("email")
                p_name = patient.get("full_name") or ""
                t_name = therapist.get("full_name") or ""
                appt_date_str = (
                    appt.get("date").isoformat()
                    if isinstance(appt.get("date"), datetime)
                    else str(appt.get("date", ""))
                )
                if p_email:
                    await EmailService.send_email(
                        p_email,
                        "TheraAI — Session reminder (15 minutes)",
                        f"<p>Hi {p_name}, your session with {t_name} starts in 15 minutes.</p><p>Scheduled: {appt_date_str}</p>",
                    )
                if t_email:
                    await EmailService.send_email(
                        t_email,
                        "TheraAI — Session reminder (15 minutes)",
                        f"<p>Hi {t_name}, your session with {p_name} starts in 15 minutes.</p><p>Scheduled: {appt_date_str}</p>",
                    )
            except Exception as e:
                logger.error(f"reminder email failed: {e}")
    except Exception as e:
        logger.error(f"_delayed_reminder failed: {e}")


def schedule_appointment_reminders(
    appointment_id: str,
    scheduled_at: datetime,
    patient_id: str,
    therapist_id: str,
) -> None:
    """Schedule T-15m / T-5m / T-0 reminders for an appointment. Best-effort."""
    try:
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        now = _now_utc()
        for offset, n_type, title in REMINDER_OFFSETS:
            fire_at = scheduled_at.timestamp() - offset
            delay = fire_at - now.timestamp()
            if delay < -30:
                # Reminder in the past — skip
                continue
            try:
                asyncio.create_task(
                    _delayed_reminder(
                        appointment_id=appointment_id,
                        delay_seconds=max(0, delay),
                        n_type=n_type,
                        title=title,
                        patient_id=patient_id,
                        therapist_id=therapist_id,
                    )
                )
            except RuntimeError:
                # No running loop — skip silently
                logger.warning("schedule_appointment_reminders: no running event loop")
                break
    except Exception as e:
        logger.error(f"schedule_appointment_reminders failed: {e}")
