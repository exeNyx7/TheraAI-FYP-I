"""
Video Calls API Routes for TheraAI
Generates Jitsi Meet room URLs for therapy sessions
"""

import time
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..models.user import UserOut
from ..dependencies.auth import get_current_user
from ..database import get_database
from ..config import get_settings

router = APIRouter(prefix="/calls", tags=["Video Calls"])


class RoomRequest(BaseModel):
    appointment_id: str


class RoomResponse(BaseModel):
    room_name: str
    jitsi_url: str
    appointment_id: str


@router.post(
    "/room",
    response_model=RoomResponse,
    summary="Create or retrieve a Jitsi Meet room for an appointment",
)
async def create_room(
    payload: RoomRequest,
    current_user: UserOut = Depends(get_current_user),
):
    """
    Validates the appointment belongs to the caller and returns a Jitsi Meet URL.
    The room name is deterministic per appointment so both parties get the same room.
    """
    from bson import ObjectId

    settings = get_settings()
    db = await get_database()
    user_id = str(current_user.id)

    if not ObjectId.is_valid(payload.appointment_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid appointment ID",
        )

    appt = await db.appointments.find_one({"_id": ObjectId(payload.appointment_id)})
    if not appt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found",
        )

    # Only patient, therapist, or admin may join
    is_participant = appt["patient_id"] == user_id or appt["therapist_id"] == user_id
    if not is_participant:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant of this appointment",
            )

    # Use stable room name if already generated, otherwise create and persist
    room_name = appt.get("jitsi_room_name")
    if not room_name:
        # Create deterministic but obscure room name
        room_name = f"theraai-{payload.appointment_id}"
        await db.appointments.update_one(
            {"_id": ObjectId(payload.appointment_id)},
            {"$set": {"jitsi_room_name": room_name}},
        )

    jitsi_domain = getattr(settings, "jitsi_domain", "meet.jit.si")
    jitsi_url = f"https://{jitsi_domain}/{room_name}"

    return RoomResponse(
        room_name=room_name,
        jitsi_url=jitsi_url,
        appointment_id=payload.appointment_id,
    )
