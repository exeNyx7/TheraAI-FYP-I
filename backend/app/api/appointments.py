"""
Appointments & Therapists API for TheraAI
Patient booking flow + therapist status management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from ..dependencies.auth import get_current_user
from ..dependencies.rbac import require_patient, require_therapist
from ..models.user import UserOut
from ..models.appointments import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentStatusUpdate,
    AppointmentCancel,
    TherapistProfileOut,
    AvailableSlot,
)
from ..services.appointments_service import AppointmentsService
from ..services.email_service import EmailService

# ---------- Appointments router ----------
appointments_router = APIRouter(prefix="/appointments", tags=["Appointments"])

# ---------- Therapists router ----------
therapists_router = APIRouter(prefix="/therapists", tags=["Therapists"])


# ===========================================================================
# Appointments endpoints
# ===========================================================================

@appointments_router.get("", response_model=List[AppointmentOut])
async def list_appointments(
    current_user: UserOut = Depends(get_current_user),
):
    """List appointments for the current user (role-aware)."""
    return await AppointmentsService.get_appointments(current_user.id, current_user.role)


@appointments_router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    data: AppointmentCreate,
    current_user: UserOut = Depends(require_patient),
):
    """Book a new appointment (patient only). Sends confirmation email."""
    import asyncio
    try:
        appt = await AppointmentsService.book_appointment(current_user.id, data)
        # Fire-and-forget confirmation email
        if current_user.email:
            slot_time = str(appt.slot.get("start_time", "")) if isinstance(appt.slot, dict) else str(appt.slot)
            asyncio.create_task(EmailService.send_appointment_confirmation(
                patient_email=current_user.email,
                patient_name=current_user.full_name or "Patient",
                therapist_name=appt.therapist_name or "Your therapist",
                appointment_time=slot_time,
                appointment_id=str(appt.id),
            ))
        return appt
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@appointments_router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: str,
    current_user: UserOut = Depends(get_current_user),
):
    """Get a single appointment (must be participant)."""
    appt = await AppointmentsService.get_appointment(appointment_id, current_user.id, current_user.role)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appt


@appointments_router.patch("/{appointment_id}/status", response_model=AppointmentOut)
async def update_appointment_status(
    appointment_id: str,
    data: AppointmentStatusUpdate,
    current_user: UserOut = Depends(require_therapist),
):
    """Update appointment status (therapist only)."""
    try:
        appt = await AppointmentsService.update_status(appointment_id, current_user.id, data.status)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appt


@appointments_router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
async def cancel_appointment(
    appointment_id: str,
    data: AppointmentCancel,
    current_user: UserOut = Depends(get_current_user),
):
    """Cancel an appointment (patient or therapist)."""
    try:
        appt = await AppointmentsService.cancel_appointment(
            appointment_id, current_user.id, current_user.role, data.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appt


# ===========================================================================
# Therapists endpoints
# ===========================================================================

@therapists_router.get("", response_model=List[TherapistProfileOut])
async def list_therapists(
    current_user: UserOut = Depends(get_current_user),
):
    """Browse all therapists that are accepting patients."""
    return await AppointmentsService.get_therapists()


@therapists_router.get("/{therapist_id}", response_model=TherapistProfileOut)
async def get_therapist(
    therapist_id: str,
    current_user: UserOut = Depends(get_current_user),
):
    """Get a therapist's public profile."""
    profile = await AppointmentsService.get_therapist(therapist_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapist not found")
    return profile


@therapists_router.get("/{therapist_id}/slots", response_model=List[AvailableSlot])
async def get_therapist_slots(
    therapist_id: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: UserOut = Depends(get_current_user),
):
    """Get available 1-hour appointment slots for a therapist on a given date."""
    return await AppointmentsService.get_available_slots(therapist_id, date)
