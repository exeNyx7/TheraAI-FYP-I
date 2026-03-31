"""
Therapist Service Layer for TheraAI
Aggregates dashboard stats, patient lists, alerts, and AI briefings
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import httpx

from ..database import get_database
from ..models.appointment import AppointmentStatus


class TherapistService:
    """Service for therapist dashboard data aggregation"""

    @staticmethod
    async def get_dashboard_stats(therapist_id: str) -> Dict[str, Any]:
        """Get aggregate dashboard stats for a therapist"""
        db = await get_database()
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=7)
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Count distinct patients via appointments
        patient_pipeline = [
            {"$match": {"therapist_id": therapist_id}},
            {"$group": {"_id": "$patient_id"}},
            {"$count": "total"},
        ]
        patient_result = await db.appointments.aggregate(patient_pipeline).to_list(1)
        total_patients = patient_result[0]["total"] if patient_result else 0

        # Sessions this week
        sessions_this_week = await db.appointments.count_documents({
            "therapist_id": therapist_id,
            "scheduled_at": {"$gte": week_start},
            "status": {"$in": [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED]},
        })

        # Appointments today
        appointments_today = await db.appointments.count_documents({
            "therapist_id": therapist_id,
            "scheduled_at": {"$gte": start_of_day, "$lt": end_of_day},
            "status": AppointmentStatus.SCHEDULED,
        })

        # Unacknowledged crisis alerts for therapist's patients
        # Get all patient ids for this therapist
        patient_ids_cursor = db.appointments.aggregate([
            {"$match": {"therapist_id": therapist_id}},
            {"$group": {"_id": "$patient_id"}},
        ])
        patient_ids = [doc["_id"] async for doc in patient_ids_cursor]

        pending_alerts = 0
        if patient_ids:
            pending_alerts = await db.crisis_events.count_documents({
                "patient_id": {"$in": patient_ids},
                "acknowledged": False,
            })

        return {
            "total_patients": total_patients,
            "sessions_this_week": sessions_this_week,
            "appointments_today": appointments_today,
            "pending_alerts": pending_alerts,
        }

    @staticmethod
    async def get_patients(therapist_id: str) -> List[Dict[str, Any]]:
        """Get all patients for a therapist with recent activity"""
        db = await get_database()

        # Get distinct patient IDs from appointments
        pipeline = [
            {"$match": {"therapist_id": therapist_id}},
            {"$group": {"_id": "$patient_id"}},
        ]
        patient_ids = [doc["_id"] async for doc in db.appointments.aggregate(pipeline)]

        patients = []
        for patient_id in patient_ids:
            try:
                patient = await db.users.find_one({"_id": ObjectId(patient_id)})
                if not patient:
                    continue

                # Get latest mood entry
                latest_mood = await db.moods.find_one(
                    {"user_id": patient_id},
                    sort=[("created_at", -1)],
                )

                # Get latest appointment with this therapist
                latest_appt = await db.appointments.find_one(
                    {"therapist_id": therapist_id, "patient_id": patient_id},
                    sort=[("scheduled_at", -1)],
                )

                # Check for unacknowledged crisis events
                crisis_count = await db.crisis_events.count_documents({
                    "patient_id": patient_id,
                    "acknowledged": False,
                })

                patients.append({
                    "id": patient_id,
                    "full_name": patient.get("full_name", "Unknown"),
                    "email": patient.get("email", ""),
                    "latest_mood": latest_mood.get("mood") if latest_mood else None,
                    "latest_mood_date": latest_mood["created_at"].isoformat() if latest_mood and latest_mood.get("created_at") else None,
                    "last_appointment": latest_appt["scheduled_at"].isoformat() if latest_appt and latest_appt.get("scheduled_at") else None,
                    "last_appointment_status": latest_appt.get("status") if latest_appt else None,
                    "unacknowledged_alerts": crisis_count,
                    "member_since": patient.get("created_at", datetime.now(timezone.utc)).isoformat() if patient.get("created_at") else None,
                })
            except Exception:
                continue

        return patients

    @staticmethod
    async def get_patient_history(
        therapist_id: str,
        patient_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Get a patient's journal, mood, and appointment history"""
        db = await get_database()

        # Validate the therapist has at least one appointment with this patient
        has_access = await db.appointments.find_one({
            "therapist_id": therapist_id,
            "patient_id": patient_id,
        })
        if not has_access:
            return {"error": "Access denied — no appointments with this patient"}

        patient = await db.users.find_one({"_id": ObjectId(patient_id)})
        if not patient:
            return {"error": "Patient not found"}

        # Journals (recent)
        journals_cursor = (
            db.journals.find({"user_id": patient_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        journals = []
        async for doc in journals_cursor:
            journals.append({
                "id": str(doc["_id"]),
                "title": doc.get("title"),
                "mood": doc.get("mood"),
                "sentiment_label": doc.get("sentiment_label"),
                "content_excerpt": (doc.get("content") or "")[:200],
                "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
            })

        # Recent moods
        moods_cursor = (
            db.moods.find({"user_id": patient_id})
            .sort("created_at", -1)
            .limit(30)
        )
        moods = []
        async for doc in moods_cursor:
            moods.append({
                "id": str(doc["_id"]),
                "mood": doc.get("mood"),
                "energy_level": doc.get("energy_level"),
                "notes": doc.get("notes"),
                "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
            })

        # Appointments with this therapist
        appts_cursor = (
            db.appointments.find({
                "therapist_id": therapist_id,
                "patient_id": patient_id,
            })
            .sort("scheduled_at", -1)
            .limit(10)
        )
        appointments = []
        async for doc in appts_cursor:
            appointments.append({
                "id": str(doc["_id"]),
                "scheduled_at": doc["scheduled_at"].isoformat() if doc.get("scheduled_at") else None,
                "status": doc.get("status"),
                "type": doc.get("type"),
                "duration_minutes": doc.get("duration_minutes"),
                "notes": doc.get("notes"),
            })

        return {
            "patient": {
                "id": patient_id,
                "full_name": patient.get("full_name"),
                "email": patient.get("email"),
                "created_at": patient.get("created_at", datetime.now(timezone.utc)).isoformat() if patient.get("created_at") else None,
            },
            "journals": journals,
            "moods": moods,
            "appointments": appointments,
        }

    @staticmethod
    async def get_alerts(therapist_id: str) -> List[Dict[str, Any]]:
        """Get unacknowledged crisis alerts for a therapist's patients"""
        db = await get_database()

        # Get patient IDs
        pipeline = [
            {"$match": {"therapist_id": therapist_id}},
            {"$group": {"_id": "$patient_id"}},
        ]
        patient_ids = [doc["_id"] async for doc in db.appointments.aggregate(pipeline)]

        if not patient_ids:
            return []

        crisis_cursor = (
            db.crisis_events.find({
                "patient_id": {"$in": patient_ids},
                "acknowledged": False,
            })
            .sort("created_at", -1)
            .limit(50)
        )

        alerts = []
        async for doc in crisis_cursor:
            # Enrich with patient name
            patient_name = doc.get("patient_name")
            if not patient_name:
                try:
                    patient = await db.users.find_one({"_id": ObjectId(doc["patient_id"])})
                    patient_name = patient.get("full_name", "Unknown") if patient else "Unknown"
                except Exception:
                    patient_name = "Unknown"

            alerts.append({
                "id": str(doc["_id"]),
                "patient_id": doc["patient_id"],
                "patient_name": patient_name,
                "severity": doc.get("severity", "medium"),
                "trigger": doc.get("trigger", ""),
                "source": doc.get("source", "chat"),
                "message_excerpt": doc.get("message_excerpt"),
                "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
            })

        return alerts

    @staticmethod
    async def acknowledge_alert(alert_id: str, therapist_id: str) -> bool:
        """Mark a crisis alert as acknowledged"""
        db = await get_database()
        if not ObjectId.is_valid(alert_id):
            return False
        result = await db.crisis_events.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {
                "acknowledged": True,
                "acknowledged_by": therapist_id,
                "acknowledged_at": datetime.now(timezone.utc),
            }},
        )
        return result.modified_count > 0

    @staticmethod
    async def get_presession_briefing(therapist_id: str, patient_id: str) -> Dict[str, Any]:
        """Generate an AI pre-session briefing for a patient"""
        db = await get_database()

        # Validate access
        has_access = await db.appointments.find_one({
            "therapist_id": therapist_id,
            "patient_id": patient_id,
        })
        if not has_access:
            return {"error": "Access denied"}

        patient = await db.users.find_one({"_id": ObjectId(patient_id)})
        if not patient:
            return {"error": "Patient not found"}

        # Gather recent data
        journals_cursor = (
            db.journals.find({"user_id": patient_id})
            .sort("created_at", -1)
            .limit(5)
        )
        journals = await journals_cursor.to_list(5)

        moods_cursor = (
            db.moods.find({"user_id": patient_id})
            .sort("created_at", -1)
            .limit(10)
        )
        moods = await moods_cursor.to_list(10)

        crisis_events_cursor = (
            db.crisis_events.find({"patient_id": patient_id})
            .sort("created_at", -1)
            .limit(3)
        )
        crisis_events = await crisis_events_cursor.to_list(3)

        # Build context for AI
        journal_summary = ""
        for j in journals:
            date = j.get("created_at", "")
            if hasattr(date, "strftime"):
                date = date.strftime("%Y-%m-%d")
            sentiment = j.get("sentiment_label", "unknown")
            excerpt = (j.get("content") or "")[:300]
            journal_summary += f"[{date}] Mood: {j.get('mood', 'N/A')}, Sentiment: {sentiment}. \"{excerpt}\"\n"

        mood_summary = ""
        for m in moods:
            date = m.get("created_at", "")
            if hasattr(date, "strftime"):
                date = date.strftime("%Y-%m-%d")
            mood_summary += f"[{date}] {m.get('mood', 'N/A')} (energy: {m.get('energy_level', 'N/A')})\n"

        crisis_summary = ""
        for c in crisis_events:
            date = c.get("created_at", "")
            if hasattr(date, "strftime"):
                date = date.strftime("%Y-%m-%d")
            crisis_summary += f"[{date}] {c.get('severity', 'N/A')} — {c.get('trigger', '')}\n"

        prompt = f"""You are a clinical assistant preparing a brief pre-session note for a therapist.

Patient: {patient.get('full_name', 'Patient')}

Recent Journal Entries (last 5):
{journal_summary or 'No recent journal entries.'}

Recent Mood Logs (last 10):
{mood_summary or 'No recent mood logs.'}

Recent Crisis Events:
{crisis_summary or 'No recent crisis events.'}

Write a concise 2-3 paragraph clinical pre-session briefing covering:
1. Patient's recent emotional trends
2. Key concerns or patterns to explore
3. Suggested focus areas for today's session

Keep it professional and clinically appropriate."""

        # Call Ollama
        briefing_text = "Unable to generate AI briefing. Please review the patient data manually."
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": "llama3.1:8b",
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.3, "num_predict": 500},
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    briefing_text = data.get("response", briefing_text)
        except Exception:
            pass  # Fallback to static message if Ollama is down

        return {
            "patient_name": patient.get("full_name"),
            "briefing": briefing_text,
            "data_summary": {
                "journals_analyzed": len(journals),
                "moods_analyzed": len(moods),
                "crisis_events": len(crisis_events),
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
