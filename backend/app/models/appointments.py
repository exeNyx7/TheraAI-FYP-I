"""
Appointments & Therapist Profile Models for TheraAI
Collections: therapist_profiles, appointments
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


# ---------------------------------------------------------------------------
# Therapist Profile
# ---------------------------------------------------------------------------

class TimeSlotAvailability(BaseModel):
    start: str = Field(..., description="HH:MM format, e.g. '09:00'")
    end: str = Field(..., description="HH:MM format, e.g. '17:00'")


class WeeklyAvailability(BaseModel):
    monday: List[TimeSlotAvailability] = []
    tuesday: List[TimeSlotAvailability] = []
    wednesday: List[TimeSlotAvailability] = []
    thursday: List[TimeSlotAvailability] = []
    friday: List[TimeSlotAvailability] = []
    saturday: List[TimeSlotAvailability] = []
    sunday: List[TimeSlotAvailability] = []


class TherapistProfileCreate(BaseModel):
    specializations: List[str] = Field(..., min_length=1)
    bio: str = Field(..., min_length=10, max_length=1000)
    years_experience: int = Field(..., ge=0)
    hourly_rate: float = Field(..., gt=0)
    currency: str = "PKR"
    availability: WeeklyAvailability = Field(default_factory=WeeklyAvailability)
    is_accepting_patients: bool = True


class TherapistProfileUpdate(BaseModel):
    specializations: Optional[List[str]] = None
    bio: Optional[str] = Field(None, min_length=10, max_length=1000)
    years_experience: Optional[int] = Field(None, ge=0)
    hourly_rate: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    availability: Optional[WeeklyAvailability] = None
    is_accepting_patients: Optional[bool] = None


class TherapistProfileOut(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    full_name: Optional[str] = None
    specializations: List[str]
    bio: str
    years_experience: int
    hourly_rate: float
    currency: str
    availability: WeeklyAvailability
    rating: float = 0.0
    total_reviews: int = 0
    is_accepting_patients: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()},
    )


# ---------------------------------------------------------------------------
# Available Slot (returned by /therapists/{id}/slots)
# ---------------------------------------------------------------------------

class AvailableSlot(BaseModel):
    date: str           # YYYY-MM-DD
    start_time: str     # HH:MM
    end_time: str       # HH:MM
    is_available: bool


# ---------------------------------------------------------------------------
# Appointment
# ---------------------------------------------------------------------------

class PaymentInfo(BaseModel):
    amount: float = 0.0
    currency: str = "PKR"
    status: Literal["pending", "paid", "refunded"] = "pending"
    method: Optional[Literal["card", "bank_transfer"]] = None
    paid_at: Optional[datetime] = None


class AppointmentCreate(BaseModel):
    therapist_id: str
    scheduled_at: datetime = Field(..., description="UTC datetime for the appointment")
    duration_minutes: int = Field(default=60, ge=30, le=180)
    type: Literal["video", "audio", "chat"] = "video"


class AppointmentStatusUpdate(BaseModel):
    status: Literal["confirmed", "in_progress", "completed", "no_show"]


class AppointmentCancel(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class AppointmentOut(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    patient_id: str
    therapist_id: str
    scheduled_at: datetime
    duration_minutes: int
    type: Literal["video", "audio", "chat"]
    status: Literal["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]
    notes: Optional[str] = None
    payment: PaymentInfo
    meeting_link: Optional[str] = None
    cancelled_by: Optional[Literal["patient", "therapist"]] = None
    cancel_reason: Optional[str] = None
    # Enriched fields (joined from users / therapist_profiles)
    therapist_name: Optional[str] = None
    patient_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()},
    )
