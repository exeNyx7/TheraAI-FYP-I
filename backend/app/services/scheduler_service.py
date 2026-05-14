"""
Scheduler Service for TheraAI
APScheduler-based background job runner for appointment reminders
"""

import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

_scheduler = None


def _create_scheduler():
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        return AsyncIOScheduler(timezone="UTC")
    except ImportError:
        logger.warning("APScheduler not installed — appointment reminders disabled. Run: pip install apscheduler")
        return None


async def _check_upcoming_appointments():
    """
    Runs every hour.
    Finds appointments starting in the 23–25 hour window and sends reminders.
    """
    try:
        from ..database import get_database
        from ..services.email_service import EmailService

        db = await get_database()
        now = datetime.now(timezone.utc)
        window_start = now + timedelta(hours=23)
        window_end = now + timedelta(hours=25)

        cursor = db.appointments.find({
            "scheduled_at": {"$gte": window_start, "$lte": window_end},
            "status": "scheduled",
            "reminder_sent": False,
        })

        count = 0
        async for appt in cursor:
            try:
                from bson import ObjectId

                patient = await db.users.find_one({"_id": ObjectId(appt["patient_id"])})
                therapist = await db.users.find_one({"_id": ObjectId(appt["therapist_id"])})

                if not patient or not therapist:
                    continue

                # Send email reminder
                await EmailService.send_appointment_reminder(
                    to_email=patient["email"],
                    patient_name=patient["full_name"],
                    therapist_name=therapist["full_name"],
                    scheduled_at=appt["scheduled_at"],
                )

                # In-app notification
                try:
                    from ..services.notification_service import create_notification
                    formatted = appt["scheduled_at"].strftime("%b %d at %I:%M %p")
                    await create_notification(
                        db, appt["patient_id"], "appointment_reminder",
                        "Session Tomorrow",
                        f"Your session with {therapist['full_name']} is tomorrow at {formatted}.",
                        {"appointment_id": str(appt["_id"])},
                    )
                except Exception:
                    pass

                # FCM push notification if configured
                try:
                    from ..services.notification_service import NotificationService
                    if NotificationService.is_initialized():
                        await NotificationService.send_to_user(
                            user_id=appt["patient_id"],
                            title="Appointment Reminder",
                            body=f"Your session with {therapist['full_name']} is tomorrow.",
                            data={"type": "appointment_reminder", "appointment_id": str(appt["_id"])},
                        )
                except Exception:
                    pass

                # Mark reminder as sent
                await db.appointments.update_one(
                    {"_id": appt["_id"]},
                    {"$set": {"reminder_sent": True}},
                )
                count += 1

            except Exception as e:
                logger.error(f"Error sending reminder for appointment {appt.get('_id')}: {e}")

        if count:
            logger.info(f"Sent {count} appointment reminder(s)")

    except Exception as e:
        logger.error(f"Scheduler job failed: {e}")


def start_scheduler():
    """Start the APScheduler background scheduler"""
    global _scheduler
    scheduler = _create_scheduler()
    if scheduler is None:
        return

    try:
        from apscheduler.triggers.interval import IntervalTrigger

        scheduler.add_job(
            _check_upcoming_appointments,
            IntervalTrigger(hours=1),
            id="appointment_reminders",
            replace_existing=True,
        )
        scheduler.start()
        _scheduler = scheduler
        logger.info("Appointment reminder scheduler started (runs every hour)")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")


def stop_scheduler():
    """Stop the scheduler gracefully"""
    global _scheduler
    if _scheduler and _scheduler.running:
        try:
            _scheduler.shutdown(wait=False)
            logger.info("Scheduler stopped")
        except Exception:
            pass
