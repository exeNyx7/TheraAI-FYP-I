"""
Therapist Dashboard API for TheraAI
Stats, patient management, alerts, and profile endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies.auth import get_current_user
from ..dependencies.rbac import require_therapist, require_therapist_or_admin
from ..models.user import UserOut
from ..models.appointments import TherapistProfileOut, TherapistProfileCreate, TherapistProfileUpdate
from ..services.therapist_service import TherapistService

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
