"""
Therapist Dashboard Service for TheraAI
Handles dashboard stats, patient list, patient history, alerts, and profile management.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId

from ..database import get_database
from ..models.appointments import (
    TherapistProfileCreate,
    TherapistProfileUpdate,
    TherapistProfileOut,
    WeeklyAvailability,
)

WEEKDAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


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


class TherapistService:

    # ------------------------------------------------------------------
    # Profile management
    # ------------------------------------------------------------------

    @staticmethod
    async def get_or_create_profile(therapist_id: str) -> TherapistProfileOut:
        db = await get_database()
        doc = await db.therapist_profiles.find_one({"user_id": therapist_id})
        if doc:
            user = await db.users.find_one({"_id": ObjectId(therapist_id)})
            full_name = user.get("full_name") if user else None
            return _doc_to_therapist(doc, full_name)

        # Create minimal default profile
        now = datetime.now(timezone.utc)
        user = await db.users.find_one({"_id": ObjectId(therapist_id)})
        default_doc = {
            "user_id": therapist_id,
            "full_name": user.get("full_name") if user else None,
            "specializations": [],
            "bio": "",
            "years_experience": 0,
            "hourly_rate": 0.0,
            "currency": "PKR",
            "availability": {day: [] for day in WEEKDAY_NAMES},
            "rating": 0.0,
            "total_reviews": 0,
            "is_accepting_patients": False,
            "created_at": now,
        }
        result = await db.therapist_profiles.insert_one(default_doc)
        default_doc["_id"] = result.inserted_id
        full_name = user.get("full_name") if user else None
        return _doc_to_therapist(default_doc, full_name)

    @staticmethod
    async def update_profile(therapist_id: str, data: TherapistProfileUpdate) -> Optional[TherapistProfileOut]:
        db = await get_database()
        doc = await db.therapist_profiles.find_one({"user_id": therapist_id})
        if not doc:
            return None

        updates = data.model_dump(exclude_unset=True)
        if "availability" in updates and updates["availability"] is not None:
            # Convert nested WeeklyAvailability to plain dict
            avail = updates["availability"]
            if hasattr(avail, "model_dump"):
                avail = avail.model_dump()
            # Convert each day's list of TimeSlotAvailability dicts
            for day in WEEKDAY_NAMES:
                if day in avail and avail[day]:
                    avail[day] = [
                        (s.model_dump() if hasattr(s, "model_dump") else s)
                        for s in avail[day]
                    ]
            updates["availability"] = avail

        if not updates:
            user = await db.users.find_one({"_id": ObjectId(therapist_id)})
            full_name = user.get("full_name") if user else None
            return _doc_to_therapist(doc, full_name)

        await db.therapist_profiles.update_one(
            {"user_id": therapist_id},
            {"$set": updates},
        )
        updated = await db.therapist_profiles.find_one({"user_id": therapist_id})
        user = await db.users.find_one({"_id": ObjectId(therapist_id)})
        full_name = user.get("full_name") if user else None
        return _doc_to_therapist(updated, full_name)

    # ------------------------------------------------------------------
    # Dashboard stats
    # ------------------------------------------------------------------

    @staticmethod
    async def get_dashboard_stats(therapist_id: str) -> Dict[str, Any]:
        db = await get_database()

        # Total unique patients (ever had a non-cancelled appointment)
        pipeline = [
            {"$match": {
                "therapist_id": therapist_id,
                "status": {"$nin": ["cancelled", "no_show"]},
            }},
            {"$group": {"_id": "$patient_id"}},
            {"$count": "total"},
        ]
        patient_agg = await db.appointments.aggregate(pipeline).to_list(length=None)
        total_patients = patient_agg[0]["total"] if patient_agg else 0

        # Sessions this week
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)
        sessions_this_week = await db.appointments.count_documents({
            "therapist_id": therapist_id,
            "scheduled_at": {"$gte": week_start, "$lt": week_end},
            "status": {"$in": ["confirmed", "in_progress", "completed"]},
        })

        # Upcoming appointments (confirmed or pending, in the future)
        upcoming_count = await db.appointments.count_documents({
            "therapist_id": therapist_id,
            "scheduled_at": {"$gte": now},
            "status": {"$in": ["pending", "confirmed"]},
        })

        # Alerts: patients with ≥3 consecutive negative journal sentiments in last 48h
        cutoff = now - timedelta(hours=48)
        patient_ids_cursor = db.appointments.aggregate([
            {"$match": {"therapist_id": therapist_id, "status": {"$nin": ["cancelled", "no_show"]}}},
            {"$group": {"_id": "$patient_id"}},
        ])
        patient_ids = [doc["_id"] async for doc in patient_ids_cursor]

        alert_count = 0
        for pid in patient_ids:
            recent_entries = await db.journals.find(
                {"user_id": pid, "created_at": {"$gte": cutoff}},
                sort=[("created_at", -1)],
            ).to_list(length=10)
            negatives = sum(
                1 for e in recent_entries
                if e.get("sentiment_label", "").lower() in ("negative", "very negative")
            )
            if negatives >= 3:
                alert_count += 1

        return {
            "total_patients": total_patients,
            "sessions_this_week": sessions_this_week,
            "upcoming_count": upcoming_count,
            "alert_count": alert_count,
        }

    # ------------------------------------------------------------------
    # Patients list
    # ------------------------------------------------------------------

    @staticmethod
    async def get_patients(therapist_id: str) -> List[Dict[str, Any]]:
        db = await get_database()

        # Unique patients with at least one active appointment
        pipeline = [
            {"$match": {
                "therapist_id": therapist_id,
                "status": {"$nin": ["cancelled", "no_show"]},
            }},
            {"$sort": {"scheduled_at": -1}},
            {"$group": {
                "_id": "$patient_id",
                "last_appointment": {"$first": "$scheduled_at"},
                "last_status": {"$first": "$status"},
            }},
        ]
        patient_docs = await db.appointments.aggregate(pipeline).to_list(length=None)

        results = []
        for pd in patient_docs:
            pid = pd["_id"]
            user = await db.users.find_one({"_id": ObjectId(pid)})
            if not user:
                continue

            # Latest mood entry
            latest_mood = await db.moods.find_one(
                {"user_id": pid},
                sort=[("created_at", -1)],
            )

            # Latest journal sentiment
            latest_journal = await db.journals.find_one(
                {"user_id": pid},
                sort=[("created_at", -1)],
            )

            results.append({
                "patient_id": pid,
                "full_name": user.get("full_name", "Unknown"),
                "email": user.get("email", ""),
                "last_appointment": pd["last_appointment"],
                "last_appointment_status": pd["last_status"],
                "latest_mood_score": latest_mood.get("mood_score") if latest_mood else None,
                "latest_mood_label": latest_mood.get("mood_label") if latest_mood else None,
                "latest_sentiment": latest_journal.get("sentiment_label") if latest_journal else None,
            })

        return results

    # ------------------------------------------------------------------
    # Patient history (for detail view)
    # ------------------------------------------------------------------

    @staticmethod
    async def get_patient_history(therapist_id: str, patient_id: str) -> Optional[Dict[str, Any]]:
        db = await get_database()

        # Verify this therapist has had appointments with the patient
        appointment = await db.appointments.find_one({
            "therapist_id": therapist_id,
            "patient_id": patient_id,
            "status": {"$nin": ["cancelled", "no_show"]},
        })
        if not appointment:
            return None

        user = await db.users.find_one({"_id": ObjectId(patient_id)})
        if not user:
            return None

        # Last 10 journal entries
        journals = await db.journals.find(
            {"user_id": patient_id},
            sort=[("created_at", -1)],
        ).to_list(length=10)

        # Last 14 days of mood entries
        cutoff = datetime.now(timezone.utc) - timedelta(days=14)
        moods = await db.moods.find(
            {"user_id": patient_id, "created_at": {"$gte": cutoff}},
            sort=[("created_at", -1)],
        ).to_list(length=None)

        # All assessment results
        assessments = await db.assessment_results.find(
            {"user_id": patient_id},
            sort=[("completed_at", -1)],
        ).to_list(length=None)

        def _clean(docs):
            out = []
            for d in docs:
                d["_id"] = str(d["_id"])
                out.append(d)
            return out

        return {
            "patient_id": patient_id,
            "full_name": user.get("full_name", "Unknown"),
            "email": user.get("email", ""),
            "journals": _clean(journals),
            "moods": _clean(moods),
            "assessments": _clean(assessments),
        }

    # ------------------------------------------------------------------
    # Alerts
    # ------------------------------------------------------------------

    @staticmethod
    async def get_alerts(therapist_id: str) -> List[Dict[str, Any]]:
        db = await get_database()
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=48)

        # Unique patients of this therapist
        pipeline = [
            {"$match": {"therapist_id": therapist_id, "status": {"$nin": ["cancelled", "no_show"]}}},
            {"$group": {"_id": "$patient_id"}},
        ]
        patient_ids = [doc["_id"] async for doc in db.appointments.aggregate(pipeline)]

        alerts = []
        for pid in patient_ids:
            recent_entries = await db.journals.find(
                {"user_id": pid, "created_at": {"$gte": cutoff}},
                sort=[("created_at", -1)],
            ).to_list(length=10)

            negatives = [
                e for e in recent_entries
                if e.get("sentiment_label", "").lower() in ("negative", "very negative")
            ]
            if len(negatives) >= 3:
                user = await db.users.find_one({"_id": ObjectId(pid)})
                alerts.append({
                    "patient_id": pid,
                    "full_name": user.get("full_name", "Unknown") if user else "Unknown",
                    "alert_type": "consecutive_negative_sentiments",
                    "negative_count": len(negatives),
                    "latest_entry_at": negatives[0]["created_at"] if negatives else None,
                    "message": f"{len(negatives)} consecutive negative journal entries in the last 48 hours",
                })

        return alerts
