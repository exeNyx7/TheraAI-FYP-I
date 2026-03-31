"""
Appointment Service Layer for TheraAI Teletherapy System
Handles appointment booking, management, and queries
"""

import asyncio
from typing import Optional, List
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
    async def create_appointment(patient_id: str, data: AppointmentCreate) -> AppointmentOut:
        """Book a new appointment"""
        db = await get_database()

        # Validate therapist exists and is a psychiatrist/staff
        therapist = await db.users.find_one({
            "_id": ObjectId(data.therapist_id),
            "role": "psychiatrist",
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
            appointment_doc.dict(by_alias=True, exclude={"id"})
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
        elif role in ("psychiatrist", "admin"):
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
