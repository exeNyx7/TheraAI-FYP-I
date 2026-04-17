"""
Appointments API Routes for TheraAI Teletherapy System
Handles appointment booking, listing, cancellation, and status updates
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from ..models.appointment import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
)
from ..models.user import UserOut
from ..services.appointment_service import AppointmentService
from ..dependencies.auth import get_current_user, get_current_staff

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post(
    "",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Book a new appointment",
)
async def create_appointment(
    data: AppointmentCreate,
    current_user: UserOut = Depends(get_current_user),
) -> AppointmentOut:
    """Book a new appointment with a therapist."""
    return await AppointmentService.create_appointment(
        patient_id=str(current_user.id),
        data=data,
    )


@router.get(
    "",
    response_model=List[AppointmentOut],
    summary="List user's appointments",
)
async def list_appointments(
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: UserOut = Depends(get_current_user),
) -> List[AppointmentOut]:
    """Get all appointments for the current user."""
    return await AppointmentService.get_user_appointments(
        user_id=str(current_user.id),
        role=current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{appointment_id}",
    response_model=AppointmentOut,
    summary="Get a single appointment",
)
async def get_appointment(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> AppointmentOut:
    """Get appointment details by ID."""
    return await AppointmentService.get_appointment_by_id(
        appointment_id=appointment_id,
        user_id=str(current_user.id),
    )


@router.get(
    "/{appointment_id}/patient-summary",
    summary="Get patient summary for an appointment",
)
async def get_patient_summary(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_staff),
) -> dict:
    """Return patient data shared with therapist for this appointment."""
    return await AppointmentService.get_patient_summary(
        appointment_id=appointment_id,
        requester_id=str(current_user.id),
        requester_role=current_user.role,
    )


@router.put(
    "/{appointment_id}/cancel",
    response_model=AppointmentOut,
    summary="Cancel an appointment",
)
async def cancel_appointment(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> AppointmentOut:
    """Cancel a scheduled appointment."""
    return await AppointmentService.cancel_appointment(
        appointment_id=appointment_id,
        user_id=str(current_user.id),
    )


@router.put(
    "/{appointment_id}/status",
    response_model=AppointmentOut,
    summary="Update appointment status",
)
async def update_appointment_status(
    appointment_id: str,
    update: AppointmentStatusUpdate,
    current_user: UserOut = Depends(get_current_staff),
) -> AppointmentOut:
    """Update appointment status (therapist/admin only)."""
    return await AppointmentService.update_appointment_status(
        appointment_id=appointment_id,
        user_id=str(current_user.id),
        update=update,
    )
