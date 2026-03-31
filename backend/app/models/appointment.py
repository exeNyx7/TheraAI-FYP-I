"""
Appointment Models and Schemas for TheraAI Teletherapy System
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class AppointmentType(str, Enum):
    VIDEO = "video"
    IN_PERSON = "in_person"


class AppointmentCreate(BaseModel):
    """Schema for creating a new appointment"""
    therapist_id: str = Field(..., description="ID of the therapist")
    scheduled_at: datetime = Field(..., description="Appointment date/time in UTC")
    duration_minutes: int = Field(default=50, ge=15, le=120, description="Session duration in minutes")
    type: AppointmentType = Field(default=AppointmentType.VIDEO, description="Appointment type")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Optional notes")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "therapist_id": "507f1f77bcf86cd799439012",
                "scheduled_at": "2026-04-05T14:00:00Z",
                "duration_minutes": 50,
                "type": "video",
                "notes": "First session - anxiety management"
            }
        }
    )


class AppointmentOut(BaseModel):
    """Schema for appointment output"""
    id: Optional[str] = Field(default=None, alias="_id")
    patient_id: str
    therapist_id: str
    scheduled_at: datetime
    duration_minutes: int = 50
    type: AppointmentType = AppointmentType.VIDEO
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None
    jitsi_room_name: Optional[str] = None
    reminder_sent: bool = False
    patient_name: Optional[str] = None
    therapist_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def from_doc(cls, doc: dict):
        """Create AppointmentOut from MongoDB document"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            doc['_id'] = str(doc['_id'])
        return cls(**doc)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )


class AppointmentInDB(BaseModel):
    """Schema for appointment in database"""
    id: Optional[str] = Field(default=None, alias="_id")
    patient_id: str
    therapist_id: str
    scheduled_at: datetime
    duration_minutes: int = 50
    type: AppointmentType = AppointmentType.VIDEO
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None
    jitsi_room_name: Optional[str] = None
    google_calendar_event_id: Optional[str] = None
    patient_calendar_event_id: Optional[str] = None
    therapist_calendar_event_id: Optional[str] = None
    reminder_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )


class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment status"""
    status: AppointmentStatus = Field(..., description="New appointment status")
