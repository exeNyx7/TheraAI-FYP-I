"""
Appointments Service for TheraAI
Handles therapist browsing, slot calculation, booking, status updates, and cancellations.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from bson import ObjectId

from ..database import get_database
from ..models.appointments import (
    TherapistProfileOut,
    TherapistProfileCreate,
    TherapistProfileUpdate,
    WeeklyAvailability,
    AvailableSlot,
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentCancel,
    PaymentInfo,
)

WEEKDAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

VALID_STATUS_TRANSITIONS = {
    "pending":     {"confirmed", "cancelled", "no_show"},
    "confirmed":   {"in_progress", "cancelled", "no_show"},
    "in_progress": {"completed", "no_show"},
    "completed":   set(),
    "cancelled":   set(),
    "no_show":     set(),
}


def _doc_to_therapist(doc: dict, full_name: str = None) -> TherapistProfileOut:
    avail_data = doc.get("availability", {})
    availability = WeeklyAvailability(**{
        day: avail_data.get(day, []) for day in WEEKDAY_NAMES
    })
    return TherapistProfileOut(
        **{
            "_id": str(doc["_id"]),
            "user_id": doc["user_id"],
            "full_name": full_name or doc.get("full_name"),
            "specializations": doc.get("specializations", []),
            "bio": doc.get("bio", ""),
            "years_experience": doc.get("years_experience", 0),
            "hourly_rate": doc.get("hourly_rate", 0),
            "currency": doc.get("currency", "PKR"),
            "availability": availability,
            "rating": doc.get("rating", 0.0),
            "total_reviews": doc.get("total_reviews", 0),
            "is_accepting_patients": doc.get("is_accepting_patients", True),
            "created_at": doc.get("created_at"),
        }
    )


def _doc_to_appointment(doc: dict, therapist_name: str = None, patient_name: str = None) -> AppointmentOut:
    payment_data = doc.get("payment", {})
    return AppointmentOut(
        **{
            "_id": str(doc["_id"]),
            "patient_id": doc["patient_id"],
            "therapist_id": doc["therapist_id"],
            "scheduled_at": doc["scheduled_at"],
            "duration_minutes": doc.get("duration_minutes", 60),
            "type": doc.get("type", "video"),
            "status": doc.get("status", "pending"),
            "notes": doc.get("notes"),
            "payment": PaymentInfo(**payment_data),
            "meeting_link": doc.get("meeting_link"),
            "cancelled_by": doc.get("cancelled_by"),
            "cancel_reason": doc.get("cancel_reason"),
            "therapist_name": therapist_name or doc.get("therapist_name"),
            "patient_name": patient_name or doc.get("patient_name"),
            "created_at": doc["created_at"],
            "updated_at": doc.get("updated_at"),
        }
    )


class AppointmentsService:

    # ------------------------------------------------------------------
    # Therapist profiles
    # ------------------------------------------------------------------

    @staticmethod
    async def get_therapists() -> List[TherapistProfileOut]:
        db = await get_database()
        cursor = db.therapist_profiles.find({"is_accepting_patients": True})
        results = []
        async for doc in cursor:
            # Enrich with user full_name
            user = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
            full_name = user.get("full_name") if user else None
            results.append(_doc_to_therapist(doc, full_name))
        return results

    @staticmethod
    async def get_therapist(therapist_user_id: str) -> Optional[TherapistProfileOut]:
        db = await get_database()
        doc = await db.therapist_profiles.find_one({"user_id": therapist_user_id})
        if not doc:
            return None
        user = await db.users.find_one({"_id": ObjectId(therapist_user_id)})
        full_name = user.get("full_name") if user else None
        return _doc_to_therapist(doc, full_name)

    @staticmethod
    async def get_available_slots(therapist_user_id: str, date_str: str) -> List[AvailableSlot]:
        """
        Parse therapist weekly availability for the requested date,
        subtract already-booked appointments, return 1-hour slots.
        """
        db = await get_database()
        profile = await db.therapist_profiles.find_one({"user_id": therapist_user_id})
        if not profile:
            return []

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return []

        weekday = WEEKDAY_NAMES[target_date.weekday()]
        day_slots = profile.get("availability", {}).get(weekday, [])

        # Collect booked ranges for that day
        day_start = datetime(target_date.year, target_date.month, target_date.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        booked_cursor = db.appointments.find({
            "therapist_id": therapist_user_id,
            "scheduled_at": {"$gte": day_start, "$lt": day_end},
            "status": {"$nin": ["cancelled", "no_show"]},
        })
        booked_starts = set()
        async for appt in booked_cursor:
            booked_starts.add(appt["scheduled_at"].strftime("%H:%M"))

        slots = []
        for window in day_slots:
            start_h, start_m = map(int, window["start"].split(":"))
            end_h, end_m = map(int, window["end"].split(":"))
            current = datetime(target_date.year, target_date.month, target_date.day, start_h, start_m)
            window_end = datetime(target_date.year, target_date.month, target_date.day, end_h, end_m)

            while current + timedelta(hours=1) <= window_end:
                slot_start = current.strftime("%H:%M")
                slot_end = (current + timedelta(hours=1)).strftime("%H:%M")
                slots.append(AvailableSlot(
                    date=date_str,
                    start_time=slot_start,
                    end_time=slot_end,
                    is_available=slot_start not in booked_starts,
                ))
                current += timedelta(hours=1)

        return slots

    # ------------------------------------------------------------------
    # Appointments CRUD
    # ------------------------------------------------------------------

    @staticmethod
    async def get_appointments(user_id: str, role: str) -> List[AppointmentOut]:
        db = await get_database()
        query = {"patient_id": user_id} if role == "patient" else {"therapist_id": user_id}
        cursor = db.appointments.find(query).sort("scheduled_at", -1)
        results = []
        async for doc in cursor:
            results.append(_doc_to_appointment(doc))
        return results

    @staticmethod
    async def book_appointment(patient_id: str, data: AppointmentCreate) -> AppointmentOut:
        db = await get_database()

        # Validate therapist exists and is accepting
        profile = await db.therapist_profiles.find_one({
            "user_id": data.therapist_id,
            "is_accepting_patients": True,
        })
        if not profile:
            raise ValueError("Therapist not found or not accepting patients")

        # Check for time collision (same therapist, overlapping slot, active status)
        collision = await db.appointments.find_one({
            "therapist_id": data.therapist_id,
            "scheduled_at": data.scheduled_at,
            "status": {"$nin": ["cancelled", "no_show"]},
        })
        if collision:
            raise ValueError("This time slot is already booked")

        # Enrich names
        patient = await db.users.find_one({"_id": ObjectId(patient_id)})
        therapist_user = await db.users.find_one({"_id": ObjectId(data.therapist_id)})

        now = datetime.now(timezone.utc)
        doc = {
            "patient_id": patient_id,
            "therapist_id": data.therapist_id,
            "scheduled_at": data.scheduled_at,
            "duration_minutes": data.duration_minutes,
            "type": data.type,
            "status": "pending",
            "notes": None,
            "payment": {
                "amount": profile.get("hourly_rate", 0),
                "currency": profile.get("currency", "PKR"),
                "status": "pending",
                "method": None,
                "paid_at": None,
            },
            "meeting_link": None,
            "cancelled_by": None,
            "cancel_reason": None,
            "therapist_name": therapist_user.get("full_name") if therapist_user else None,
            "patient_name": patient.get("full_name") if patient else None,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.appointments.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return _doc_to_appointment(doc)

    @staticmethod
    async def get_appointment(appointment_id: str, user_id: str, role: str) -> Optional[AppointmentOut]:
        db = await get_database()
        if not ObjectId.is_valid(appointment_id):
            return None
        doc = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not doc:
            return None
        # Authorization — must be the patient or the therapist
        if doc["patient_id"] != user_id and doc["therapist_id"] != user_id:
            return None
        return _doc_to_appointment(doc)

    @staticmethod
    async def update_status(appointment_id: str, therapist_id: str, new_status: str) -> Optional[AppointmentOut]:
        db = await get_database()
        if not ObjectId.is_valid(appointment_id):
            return None
        doc = await db.appointments.find_one({"_id": ObjectId(appointment_id), "therapist_id": therapist_id})
        if not doc:
            return None

        current = doc["status"]
        if new_status not in VALID_STATUS_TRANSITIONS.get(current, set()):
            raise ValueError(f"Cannot transition from '{current}' to '{new_status}'")

        now = datetime.now(timezone.utc)
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"status": new_status, "updated_at": now}},
        )
        doc["status"] = new_status
        doc["updated_at"] = now
        return _doc_to_appointment(doc)

    @staticmethod
    async def cancel_appointment(appointment_id: str, user_id: str, role: str, reason: Optional[str]) -> Optional[AppointmentOut]:
        db = await get_database()
        if not ObjectId.is_valid(appointment_id):
            return None
        doc = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not doc:
            return None
        if doc["patient_id"] != user_id and doc["therapist_id"] != user_id:
            return None
        if doc["status"] in ("completed", "cancelled", "no_show"):
            raise ValueError(f"Cannot cancel an appointment with status '{doc['status']}'")

        cancelled_by = "patient" if role == "patient" else "therapist"
        now = datetime.now(timezone.utc)
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {
                "status": "cancelled",
                "cancelled_by": cancelled_by,
                "cancel_reason": reason,
                "updated_at": now,
            }},
        )
        doc.update({"status": "cancelled", "cancelled_by": cancelled_by, "cancel_reason": reason, "updated_at": now})
        return _doc_to_appointment(doc)
