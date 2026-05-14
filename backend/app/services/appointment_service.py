"""
Appointment Service Layer for TheraAI Teletherapy System
Handles appointment booking, management, and queries
"""

import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from bson import ObjectId

from ..database import get_database
from ..models.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentInDB,
    AppointmentStatus,
    AppointmentStatusUpdate,
)


class AppointmentService:
    """Service class for appointment operations"""

    @staticmethod
    def _to_iso(value: Any) -> Optional[str]:
        if isinstance(value, datetime):
            return value.isoformat()
        if value is None:
            return None
        try:
            return str(value)
        except Exception:
            return None

    @staticmethod
    def _role_value(role: Any) -> str:
        return role.value if hasattr(role, "value") else (str(role) if role is not None else "")

    @staticmethod
    async def create_appointment(patient_id: str, data: AppointmentCreate) -> AppointmentOut:
        """Book a new appointment"""
        db = await get_database()

        # Validate therapist exists and is a psychiatrist/staff (accepts both role values)
        therapist = await db.users.find_one({
            "_id": ObjectId(data.therapist_id),
            "role": {"$in": ["psychiatrist", "therapist"]},
            "is_active": True,
        })
        if not therapist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Therapist not found or inactive",
            )

        # Check for scheduling conflicts (same therapist, overlapping time)
        end_time = data.scheduled_at + timedelta(minutes=data.duration_minutes)
        conflict = await db.appointments.find_one({
            "therapist_id": data.therapist_id,
            "status": AppointmentStatus.SCHEDULED,
            "scheduled_at": {
                "$lt": end_time,
                "$gt": data.scheduled_at - timedelta(minutes=data.duration_minutes),
            },
        })
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time slot is not available. The therapist has a conflicting appointment.",
            )

        # Check patient doesn't already have an appointment at this time
        patient_conflict = await db.appointments.find_one({
            "patient_id": patient_id,
            "status": AppointmentStatus.SCHEDULED,
            "scheduled_at": {
                "$lt": end_time,
                "$gt": data.scheduled_at - timedelta(minutes=data.duration_minutes),
            },
        })
        if patient_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an appointment scheduled at this time.",
            )

        now = datetime.now(timezone.utc)
        appointment_doc = AppointmentInDB(
            patient_id=patient_id,
            therapist_id=data.therapist_id,
            scheduled_at=data.scheduled_at,
            duration_minutes=data.duration_minutes,
            type=data.type,
            status=AppointmentStatus.SCHEDULED,
            notes=data.notes,
            created_at=now,
            updated_at=None,
        )

        result = await db.appointments.insert_one(
            appointment_doc.model_dump(by_alias=True, exclude={"id"})
        )

        created = await db.appointments.find_one({"_id": result.inserted_id})

        # Enrich with names
        patient = await db.users.find_one({"_id": ObjectId(patient_id)})
        if patient:
            created["patient_name"] = patient.get("full_name")
        created["therapist_name"] = therapist.get("full_name")

        # Async calendar sync (best-effort, non-blocking)
        try:
            from .calendar_service import CalendarService
            import asyncio
            asyncio.create_task(
                CalendarService.sync_appointment_created(
                    str(result.inserted_id), created
                )
            )
        except Exception:
            pass

        # Send appointment confirmation email (non-blocking)
        try:
            from .email_service import EmailService
            from ..config import get_settings
            _settings = get_settings()
            if _settings.mail_enabled and patient:
                asyncio.create_task(
                    EmailService.send_appointment_confirmation(
                        to_email=patient.get("email", ""),
                        patient_name=patient.get("full_name", "Patient"),
                        therapist_name=therapist.get("full_name", "Therapist"),
                        scheduled_at=data.scheduled_at,
                    )
                )
        except Exception:
            pass

        # In-app notifications (non-blocking)
        try:
            from .notification_service import create_notification
            formatted_time = data.scheduled_at.strftime("%b %d at %I:%M %p")
            therapist_name = therapist.get("full_name", "Your therapist")
            patient_name = patient.get("full_name", "A patient") if patient else "A patient"
            asyncio.create_task(create_notification(
                db, patient_id, "appointment_booked",
                "Appointment Confirmed",
                f"Your session with {therapist_name} on {formatted_time} is booked.",
                {"appointment_id": str(result.inserted_id)},
            ))
            asyncio.create_task(create_notification(
                db, data.therapist_id, "appointment_booked",
                "New Appointment",
                f"{patient_name} booked a session on {formatted_time}.",
                {"appointment_id": str(result.inserted_id)},
            ))
        except Exception:
            pass

        return AppointmentOut.from_doc(created)

    @staticmethod
    async def get_user_appointments(
        user_id: str,
        role: str,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AppointmentOut]:
        """Get appointments for a user (patient or therapist)"""
        db = await get_database()

        query = {}
        if role == "patient":
            query["patient_id"] = user_id
        elif role in ("psychiatrist", "therapist", "admin"):
            query["therapist_id"] = user_id
        else:
            query["patient_id"] = user_id

        if status_filter:
            query["status"] = status_filter

        cursor = (
            db.appointments.find(query)
            .sort("scheduled_at", -1)
            .skip(skip)
            .limit(limit)
        )

        appointments = []
        async for doc in cursor:
            # Enrich with names
            patient = await db.users.find_one({"_id": ObjectId(doc["patient_id"])})
            therapist = await db.users.find_one({"_id": ObjectId(doc["therapist_id"])})
            if patient:
                doc["patient_name"] = patient.get("full_name")
            if therapist:
                doc["therapist_name"] = therapist.get("full_name")
            appointments.append(AppointmentOut.from_doc(doc))

        return appointments

    @staticmethod
    async def get_appointment_by_id(appointment_id: str, user_id: str) -> AppointmentOut:
        """Get a single appointment by ID, validating access"""
        if not ObjectId.is_valid(appointment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment ID format",
            )

        db = await get_database()
        doc = await db.appointments.find_one({"_id": ObjectId(appointment_id)})

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        # Validate access: patient, therapist, or admin
        if doc["patient_id"] != user_id and doc["therapist_id"] != user_id:
            # Check if user is admin
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if not user or user.get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this appointment",
                )

        # Enrich with names
        patient = await db.users.find_one({"_id": ObjectId(doc["patient_id"])})
        therapist = await db.users.find_one({"_id": ObjectId(doc["therapist_id"])})
        if patient:
            doc["patient_name"] = patient.get("full_name")
        if therapist:
            doc["therapist_name"] = therapist.get("full_name")

        return AppointmentOut.from_doc(doc)

    @staticmethod
    async def cancel_appointment(appointment_id: str, user_id: str) -> AppointmentOut:
        """Cancel an appointment"""
        if not ObjectId.is_valid(appointment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment ID format",
            )

        db = await get_database()
        doc = await db.appointments.find_one({"_id": ObjectId(appointment_id)})

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        if doc["patient_id"] != user_id and doc["therapist_id"] != user_id:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if not user or user.get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

        if doc["status"] != AppointmentStatus.SCHEDULED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel appointment with status: {doc['status']}",
            )

        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"status": AppointmentStatus.CANCELLED, "updated_at": datetime.now(timezone.utc)}},
        )

        updated = await db.appointments.find_one({"_id": ObjectId(appointment_id)})

        patient = await db.users.find_one({"_id": ObjectId(updated["patient_id"])})
        therapist = await db.users.find_one({"_id": ObjectId(updated["therapist_id"])})
        if patient:
            updated["patient_name"] = patient.get("full_name")
        if therapist:
            updated["therapist_name"] = therapist.get("full_name")

        # Async calendar cleanup (best-effort)
        try:
            from .calendar_service import CalendarService
            import asyncio
            asyncio.create_task(
                CalendarService.sync_appointment_cancelled(appointment_id)
            )
        except Exception:
            pass

        # In-app notification for the other party
        try:
            from .notification_service import create_notification
            import asyncio
            cancelled_at = updated.get("scheduled_at")
            formatted_time = cancelled_at.strftime("%b %d at %I:%M %p") if isinstance(cancelled_at, datetime) else "your scheduled time"
            # Notify the party who did NOT cancel
            if user_id == doc["patient_id"]:
                # Patient cancelled → notify therapist
                asyncio.create_task(create_notification(
                    db, doc["therapist_id"], "appointment_cancelled",
                    "Appointment Cancelled",
                    f"{patient.get('full_name', 'A patient') if patient else 'A patient'} cancelled the session on {formatted_time}.",
                    {"appointment_id": appointment_id},
                ))
            else:
                # Therapist cancelled → notify patient
                asyncio.create_task(create_notification(
                    db, doc["patient_id"], "appointment_cancelled",
                    "Appointment Cancelled",
                    f"Your session with {therapist.get('full_name', 'your therapist') if therapist else 'your therapist'} on {formatted_time} has been cancelled.",
                    {"appointment_id": appointment_id},
                ))
        except Exception:
            pass

        return AppointmentOut.from_doc(updated)

    @staticmethod
    async def update_appointment_status(
        appointment_id: str, user_id: str, update: AppointmentStatusUpdate
    ) -> AppointmentOut:
        """Update appointment status (therapist/admin only)"""
        if not ObjectId.is_valid(appointment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment ID format",
            )

        db = await get_database()
        doc = await db.appointments.find_one({"_id": ObjectId(appointment_id)})

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"status": update.status, "updated_at": datetime.now(timezone.utc)}},
        )

        updated = await db.appointments.find_one({"_id": ObjectId(appointment_id)})

        patient = await db.users.find_one({"_id": ObjectId(updated["patient_id"])})
        therapist = await db.users.find_one({"_id": ObjectId(updated["therapist_id"])})
        if patient:
            updated["patient_name"] = patient.get("full_name")
        if therapist:
            updated["therapist_name"] = therapist.get("full_name")

        return AppointmentOut.from_doc(updated)

    @staticmethod
    async def get_today_appointments(therapist_id: str) -> List[AppointmentOut]:
        """Get today's appointments for a therapist"""
        db = await get_database()
        now = datetime.now(timezone.utc)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        cursor = db.appointments.find({
            "therapist_id": therapist_id,
            "scheduled_at": {"$gte": start_of_day, "$lt": end_of_day},
            "status": AppointmentStatus.SCHEDULED,
        }).sort("scheduled_at", 1)

        appointments = []
        async for doc in cursor:
            patient = await db.users.find_one({"_id": ObjectId(doc["patient_id"])})
            therapist = await db.users.find_one({"_id": ObjectId(doc["therapist_id"])})
            if patient:
                doc["patient_name"] = patient.get("full_name")
            if therapist:
                doc["therapist_name"] = therapist.get("full_name")
            appointments.append(AppointmentOut.from_doc(doc))

        return appointments

    @staticmethod
    async def get_patient_summary(
        appointment_id: str,
        requester_id: str,
        requester_role: Any,
    ) -> Dict[str, Any]:
        """Aggregate patient data shared for a specific appointment."""
        if not ObjectId.is_valid(appointment_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment ID format",
            )

        db = await get_database()
        appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )

        role_value = AppointmentService._role_value(requester_role)
        if role_value != "admin" and appt.get("therapist_id") != requester_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        patient_id = str(appt.get("patient_id") or "")
        if not patient_id:
            return {
                "appointment_id": appointment_id,
                "shared": {
                    "mood": False,
                    "emotions": False,
                    "demographics": False,
                    "journal": False,
                    "assessments": False,
                },
                "mood": None,
                "emotions": [],
                "demographics": None,
                "journal": [],
                "assessments": [],
            }

        sharing = await db.sharing_preferences.find_one({
            "appointment_id": appointment_id,
            "patient_id": patient_id,
        }) or {}

        shared = {
            "mood": bool(sharing.get("share_mood", False)),
            "emotions": bool(sharing.get("share_emotions", False)),
            "demographics": bool(sharing.get("share_demographics", False)),
            "journal": bool(sharing.get("share_journal", False)),
            "assessments": bool(sharing.get("share_assessments", False)),
        }

        mood_payload = None
        emotions_payload: List[Any] = []
        demographics_payload = None
        journal_payload: List[Dict[str, Any]] = []
        assessments_payload: List[Dict[str, Any]] = []

        if shared["mood"]:
            latest_mood = await db.moods.find_one({"user_id": patient_id}, sort=[("created_at", -1)])
            if latest_mood:
                mood_payload = {
                    "mood": latest_mood.get("mood"),
                    "score": latest_mood.get("score") if latest_mood.get("score") is not None else latest_mood.get("energy_level"),
                    "note": latest_mood.get("notes"),
                    "created_at": AppointmentService._to_iso(latest_mood.get("created_at") or latest_mood.get("timestamp")),
                }

        latest_journal = await db.journals.find_one({"user_id": patient_id}, sort=[("created_at", -1)])

        if shared["emotions"] and latest_journal:
            if isinstance(latest_journal.get("emotion_themes"), list):
                emotions_payload = latest_journal.get("emotion_themes") or []
            elif isinstance(latest_journal.get("top_emotions"), list):
                emotions_payload = latest_journal.get("top_emotions") or []

        if shared["demographics"] and ObjectId.is_valid(patient_id):
            patient_doc = await db.users.find_one({"_id": ObjectId(patient_id)})
            if patient_doc:
                demographics_payload = {
                    "full_name": patient_doc.get("full_name"),
                    "age": patient_doc.get("age"),
                    "gender": patient_doc.get("gender"),
                }

        if shared["journal"]:
            recent_journals = await (
                db.journals.find({"user_id": patient_id})
                .sort("created_at", -1)
                .limit(3)
                .to_list(length=3)
            )
            for entry in recent_journals:
                journal_payload.append({
                    "id": str(entry.get("_id")),
                    "title": entry.get("title") or "Journal entry",
                    "content": (entry.get("content") or "")[:350],
                    "created_at": AppointmentService._to_iso(entry.get("created_at")),
                })

        if shared["assessments"]:
            recent_assessments = await (
                db.assessment_results.find({"user_id": patient_id})
                .sort("completed_at", -1)
                .limit(5)
                .to_list(length=5)
            )
            for result in recent_assessments:
                assessments_payload.append({
                    "id": str(result.get("_id")),
                    "name": result.get("assessment_name") or result.get("assessment_slug") or "Assessment",
                    "score": result.get("total_score"),
                    "severity": result.get("severity_label"),
                    "created_at": AppointmentService._to_iso(result.get("completed_at") or result.get("created_at")),
                })

        return {
            "appointment_id": appointment_id,
            "patient_id": patient_id,
            "shared": shared,
            "mood": mood_payload,
            "emotions": emotions_payload,
            "demographics": demographics_payload,
            "journal": journal_payload,
            "assessments": assessments_payload,
        }
