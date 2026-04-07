"""
Appointment models for TheraAI
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AppointmentCreate(BaseModel):
    therapist_id: str
    date: str  # ISO datetime string
    duration_minutes: int = 60
    notes: str = ""


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    therapist_id: str
    date: str
    duration_minutes: int = 60
    notes: str = ""
    status: str = "scheduled"  # scheduled | completed | cancelled
    jitsi_room_name: str = ""
    created_at: Optional[str] = None
    therapist_name: Optional[str] = ""
    patient_name: Optional[str] = ""
