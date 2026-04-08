"""
Therapist Dashboard API Routes for TheraAI
Endpoints for therapist/psychiatrist dashboard data
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from ..models.user import UserOut
from ..services.therapist_service import TherapistService
from ..dependencies.auth import get_current_staff

router = APIRouter(prefix="/therapist", tags=["Therapist Dashboard"])


@router.get(
    "/dashboard",
    summary="Get therapist dashboard stats",
)
async def get_dashboard(
    current_user: UserOut = Depends(get_current_staff),
):
    """Aggregate stats: patient count, sessions this week, today's appointments, pending alerts."""
    return await TherapistService.get_dashboard_stats(therapist_id=str(current_user.id))


@router.get(
    "/patients",
    summary="Get therapist's patient list",
)
async def get_patients(
    current_user: UserOut = Depends(get_current_staff),
):
    """Get all patients with most recent mood and appointment info."""
    return await TherapistService.get_patients(therapist_id=str(current_user.id))


@router.get(
    "/patients/{patient_id}",
    summary="Get therapist patient profile",
)
async def get_patient_profile(
    patient_id: str,
    current_user: UserOut = Depends(get_current_staff),
):
    """Get profile summary for one patient linked to this therapist."""
    result = await TherapistService.get_patient_profile(
        therapist_id=str(current_user.id),
        patient_id=patient_id,
    )
    if "error" in result:
        if result["error"].startswith("Access denied"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=result["error"])
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result


@router.get(
    "/patients/{patient_id}/history",
    summary="Get patient history",
)
async def get_patient_history(
    patient_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: UserOut = Depends(get_current_staff),
):
    """Get a patient's journals, moods, and appointments (paginated)."""
    result = await TherapistService.get_patient_history(
        therapist_id=str(current_user.id),
        patient_id=patient_id,
        skip=skip,
        limit=limit,
    )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=result["error"])
    return result


@router.get(
    "/alerts",
    summary="Get crisis alerts for therapist's patients",
)
async def get_alerts(
    current_user: UserOut = Depends(get_current_staff),
):
    """Get all unacknowledged crisis events for this therapist's patients."""
    return await TherapistService.get_alerts(therapist_id=str(current_user.id))


@router.post(
    "/alerts/{alert_id}/acknowledge",
    summary="Acknowledge a crisis alert",
)
async def acknowledge_alert(
    alert_id: str,
    current_user: UserOut = Depends(get_current_staff),
):
    """Mark a crisis alert as acknowledged."""
    success = await TherapistService.acknowledge_alert(
        alert_id=alert_id,
        therapist_id=str(current_user.id),
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"message": "Alert acknowledged"}


@router.get(
    "/patients/{patient_id}/briefing",
    summary="AI pre-session briefing for a patient",
)
async def get_presession_briefing(
    patient_id: str,
    current_user: UserOut = Depends(get_current_staff),
):
    """Generate an AI-powered pre-session briefing summarising the patient's recent activity."""
    result = await TherapistService.get_presession_briefing(
        therapist_id=str(current_user.id),
        patient_id=patient_id,
    )
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=result["error"])
    return result
