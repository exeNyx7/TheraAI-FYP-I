"""
Therapist Dashboard API for TheraAI
Stats, patient management, alerts, profile, and pre-session briefings.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..dependencies.auth import get_current_user
from ..dependencies.rbac import require_therapist, require_therapist_or_admin
from ..models.user import UserOut
from ..models.appointments import TherapistProfileOut, TherapistProfileCreate, TherapistProfileUpdate
from ..services.therapist_service import TherapistService
from ..database import db_manager
from bson import ObjectId

router = APIRouter(prefix="/therapist", tags=["Therapist Dashboard"])


@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: UserOut = Depends(require_therapist_or_admin),
):
    """Aggregate stats for the therapist dashboard."""
    return await TherapistService.get_dashboard_stats(current_user.id)


@router.get("/patients")
async def get_patients(
    current_user: UserOut = Depends(require_therapist_or_admin),
):
    """List all patients with latest mood and journal sentiment."""
    return await TherapistService.get_patients(current_user.id)


@router.get("/patients/{patient_id}/history")
async def get_patient_history(
    patient_id: str,
    current_user: UserOut = Depends(require_therapist_or_admin),
):
    """Get a patient's full timeline: journals, moods, assessments."""
    history = await TherapistService.get_patient_history(current_user.id, patient_id)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found or not assigned to this therapist",
        )
    return history


@router.get("/alerts")
async def get_alerts(
    current_user: UserOut = Depends(require_therapist_or_admin),
):
    """Get AI-flagged at-risk patients (3+ consecutive negative sentiments in 48h)."""
    return await TherapistService.get_alerts(current_user.id)


@router.get("/profile", response_model=TherapistProfileOut)
async def get_profile(
    current_user: UserOut = Depends(require_therapist),
):
    """Get the therapist's own profile (creates a default one if none exists)."""
    return await TherapistService.get_or_create_profile(current_user.id)


@router.post("/profile", response_model=TherapistProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: TherapistProfileCreate,
    current_user: UserOut = Depends(require_therapist),
):
    """Create therapist profile (first-time setup). Uses upsert — safe to call again."""
    db_module = __import__("app.database", fromlist=["get_database"])
    from ..database import get_database
    from datetime import datetime, timezone
    db = await get_database()

    avail = data.availability.model_dump()
    doc = {
        "user_id": current_user.id,
        "specializations": data.specializations,
        "bio": data.bio,
        "years_experience": data.years_experience,
        "hourly_rate": data.hourly_rate,
        "currency": data.currency,
        "availability": avail,
        "is_accepting_patients": data.is_accepting_patients,
        "rating": 0.0,
        "total_reviews": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.therapist_profiles.update_one(
        {"user_id": current_user.id},
        {"$setOnInsert": doc},
        upsert=True,
    )
    return await TherapistService.get_or_create_profile(current_user.id)


@router.put("/profile", response_model=TherapistProfileOut)
async def update_profile(
    data: TherapistProfileUpdate,
    current_user: UserOut = Depends(require_therapist),
):
    """Update therapist profile fields."""
    profile = await TherapistService.update_profile(current_user.id, data)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Therapist profile not found. Create one first via POST /therapist/profile",
        )
    return profile


# ── Pre-Session Briefing ─────────────────────────────────────────────────────

class MoodPoint(BaseModel):
    date: str
    mood: str
    sentiment_score: Optional[float] = None


class CrisisEventOut(BaseModel):
    message: str
    severity: str
    created_at: str


class PreSessionBriefing(BaseModel):
    patient_id: str
    patient_name: str
    appointment_id: str
    appointment_time: str
    recent_mood_trend: List[MoodPoint]
    crisis_events: List[CrisisEventOut]
    last_journal_excerpt: Optional[str] = None
    last_journal_date: Optional[str] = None
    risk_level: str
    ai_notes: str


@router.get("/appointments/{appointment_id}/briefing", response_model=PreSessionBriefing)
async def get_pre_session_briefing(
    appointment_id: str,
    current_user: UserOut = Depends(require_therapist_or_admin),
):
    """
    Pre-session briefing for an upcoming appointment.
    Returns patient's recent mood trend, crisis events, journal excerpt, and AI notes.
    """
    try:
        db = db_manager.get_database()

        # Fetch appointment
        try:
            apt_doc = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid appointment ID")

        if not apt_doc:
            raise HTTPException(status_code=404, detail="Appointment not found")

        patient_id = str(apt_doc.get("patient_id", ""))

        # Fetch patient info
        try:
            patient_doc = await db.users.find_one({"_id": ObjectId(patient_id)})
        except Exception:
            patient_doc = None
        patient_name = patient_doc.get("full_name", "Unknown Patient") if patient_doc else "Unknown Patient"

        # ── Recent mood trend (last 7 days) ──────────────────────────────
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        journal_entries = await db.journals.find(
            {"user_id": patient_id, "created_at": {"$gte": week_ago}}
        ).sort("created_at", 1).to_list(length=20)

        mood_trend = [
            MoodPoint(
                date=str(e.get("created_at", ""))[:10],
                mood=e.get("mood", "neutral"),
                sentiment_score=e.get("sentiment_score"),
            )
            for e in journal_entries
        ]

        # ── Crisis events (last 30 days) ──────────────────────────────────
        month_ago = datetime.now(timezone.utc) - timedelta(days=30)
        crisis_docs = await db.crisis_events.find(
            {"user_id": patient_id, "created_at": {"$gte": month_ago}}
        ).sort("created_at", -1).to_list(length=5)

        crisis_events = [
            CrisisEventOut(
                message=c.get("message", "")[:200],
                severity=c.get("severity", "moderate"),
                created_at=str(c.get("created_at", ""))[:19],
            )
            for c in crisis_docs
        ]

        # ── Latest journal excerpt ────────────────────────────────────────
        last_journal = await db.journals.find_one(
            {"user_id": patient_id},
            sort=[("created_at", -1)],
        )
        last_excerpt = None
        last_journal_date = None
        if last_journal:
            content = last_journal.get("content", "")
            last_excerpt = content[:300] + ("…" if len(content) > 300 else "")
            last_journal_date = str(last_journal.get("created_at", ""))[:10]

        # ── Risk level from user memory ───────────────────────────────────
        memory_doc = await db.user_memory.find_one({"user_id": patient_id})
        risk_level = memory_doc.get("risk_level", "low") if memory_doc else "low"

        # ── AI notes ─────────────────────────────────────────────────────
        negative_moods = sum(1 for m in mood_trend if m.mood in ("sad", "anxious", "angry", "stressed"))
        crisis_count = len(crisis_events)
        if crisis_count > 0 or risk_level in ("high", "crisis"):
            ai_notes = (
                f"⚠ HIGH PRIORITY: {crisis_count} crisis event(s) in the last 30 days. "
                f"Risk level: {risk_level}. Consider focusing on safety planning and coping strategies."
            )
        elif negative_moods >= 3:
            ai_notes = (
                f"Patient has logged {negative_moods} negative mood entries this week. "
                "Consider exploring triggers and reinforcing healthy coping mechanisms."
            )
        elif not mood_trend:
            ai_notes = "No recent journal entries. Consider checking in on the patient's journaling habit."
        else:
            ai_notes = (
                "Patient appears stable this week. Good opportunity to review progress "
                "on goals and reinforce positive patterns."
            )

        appointment_slot = apt_doc.get("slot", {})
        apt_time = appointment_slot.get("start_time") or str(apt_doc.get("created_at", ""))

        return PreSessionBriefing(
            patient_id=patient_id,
            patient_name=patient_name,
            appointment_id=appointment_id,
            appointment_time=str(apt_time)[:19],
            recent_mood_trend=mood_trend,
            crisis_events=crisis_events,
            last_journal_excerpt=last_excerpt,
            last_journal_date=last_journal_date,
            risk_level=risk_level,
            ai_notes=ai_notes,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate briefing: {str(e)}")
