"""
Google Calendar Service for TheraAI
Syncs appointments to users' Google Calendars via OAuth2
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


class CalendarService:
    """Service for Google Calendar integration"""

    @staticmethod
    async def get_credentials(user_id: str):
        """Build Google OAuth2 Credentials from stored refresh token."""
        try:
            from google.oauth2.credentials import Credentials
            from bson import ObjectId
            from ..database import get_database
            from ..config import get_settings

            settings = get_settings()
            db = await get_database()
            user = await db.users.find_one({"_id": ObjectId(user_id)})

            if not user or not user.get("google_refresh_token"):
                return None

            creds = Credentials(
                token=None,
                refresh_token=user["google_refresh_token"],
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
                token_uri="https://oauth2.googleapis.com/token",
            )
            return creds
        except ImportError:
            logger.warning("google-auth not installed — Google Calendar disabled")
            return None
        except Exception as e:
            logger.error(f"Failed to build Google credentials for user {user_id}: {e}")
            return None

    @staticmethod
    async def create_calendar_event(user_id: str, appointment: dict) -> Optional[str]:
        """Create a Google Calendar event and return its event_id."""
        creds = await CalendarService.get_credentials(user_id)
        if not creds:
            return None

        try:
            from googleapiclient.discovery import build

            scheduled_at: datetime = appointment.get("scheduled_at")
            duration = appointment.get("duration_minutes", 50)
            end_time = scheduled_at + timedelta(minutes=duration)

            event_body = {
                "summary": "TheraAI Therapy Session",
                "description": f"Session via TheraAI. Notes: {appointment.get('notes', 'N/A')}",
                "start": {
                    "dateTime": scheduled_at.isoformat(),
                    "timeZone": "UTC",
                },
                "end": {
                    "dateTime": end_time.isoformat(),
                    "timeZone": "UTC",
                },
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "email", "minutes": 60},
                        {"method": "popup", "minutes": 15},
                    ],
                },
            }

            service = build("calendar", "v3", credentials=creds, cache_discovery=False)
            created = service.events().insert(calendarId="primary", body=event_body).execute()
            return created.get("id")

        except Exception as e:
            logger.error(f"Failed to create Google Calendar event for user {user_id}: {e}")
            return None

    @staticmethod
    async def update_calendar_event(
        user_id: str, event_id: str, appointment: dict
    ) -> bool:
        """Update an existing Google Calendar event."""
        creds = await CalendarService.get_credentials(user_id)
        if not creds or not event_id:
            return False

        try:
            from googleapiclient.discovery import build

            scheduled_at: datetime = appointment.get("scheduled_at")
            duration = appointment.get("duration_minutes", 50)
            end_time = scheduled_at + timedelta(minutes=duration)

            event_body = {
                "summary": "TheraAI Therapy Session",
                "start": {"dateTime": scheduled_at.isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"},
            }

            service = build("calendar", "v3", credentials=creds, cache_discovery=False)
            service.events().update(
                calendarId="primary", eventId=event_id, body=event_body
            ).execute()
            return True

        except Exception as e:
            logger.error(f"Failed to update Google Calendar event: {e}")
            return False

    @staticmethod
    async def delete_calendar_event(user_id: str, event_id: str) -> bool:
        """Delete a Google Calendar event."""
        creds = await CalendarService.get_credentials(user_id)
        if not creds or not event_id:
            return False

        try:
            from googleapiclient.discovery import build

            service = build("calendar", "v3", credentials=creds, cache_discovery=False)
            service.events().delete(calendarId="primary", eventId=event_id).execute()
            return True

        except Exception as e:
            logger.error(f"Failed to delete Google Calendar event: {e}")
            return False

    @staticmethod
    async def sync_appointment_created(appointment_id: str, appointment_doc: dict):
        """Sync a newly created appointment to both patient's and therapist's calendars."""
        from ..database import get_database
        from bson import ObjectId

        db = await get_database()

        update_fields = {}
        for role, id_key in [("patient", "patient_id"), ("therapist", "therapist_id")]:
            user_id = appointment_doc.get(id_key)
            if user_id:
                event_id = await CalendarService.create_calendar_event(user_id, appointment_doc)
                if event_id:
                    field = f"{role}_calendar_event_id"
                    update_fields[field] = event_id

        if update_fields:
            await db.appointments.update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": update_fields},
            )

    @staticmethod
    async def sync_appointment_cancelled(appointment_id: str):
        """Delete calendar events when an appointment is cancelled."""
        from ..database import get_database
        from bson import ObjectId

        db = await get_database()
        appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appt:
            return

        for role, id_key, event_key in [
            ("patient", "patient_id", "patient_calendar_event_id"),
            ("therapist", "therapist_id", "therapist_calendar_event_id"),
        ]:
            user_id = appt.get(id_key)
            event_id = appt.get(event_key)
            if user_id and event_id:
                await CalendarService.delete_calendar_event(user_id, event_id)
