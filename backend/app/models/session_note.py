"""
Session Note Models for TheraAI Backend (SOAP format + extras)
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class SessionNoteCreate(BaseModel):
    """Schema for creating a session note"""
    appointment_id: str
    patient_id: str
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    prescriptions: List[str] = Field(default_factory=list)
    exercises: List[str] = Field(default_factory=list)
    conclusion: str = ""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "appointment_id": "507f1f77bcf86cd799439020",
                "patient_id": "507f1f77bcf86cd799439011",
                "subjective": "Patient reports improved mood.",
                "objective": "Alert, engaged, affect congruent.",
                "assessment": "GAD, mild improvement.",
                "plan": "Continue weekly CBT.",
                "prescriptions": [],
                "exercises": ["4-7-8 breathing"],
                "conclusion": "Good session overall.",
            }
        }
    )


class SessionNoteUpdate(BaseModel):
    """Schema for updating a session note"""
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    prescriptions: Optional[List[str]] = None
    exercises: Optional[List[str]] = None
    conclusion: Optional[str] = None


class SessionNoteOut(BaseModel):
    """Schema for returning a session note"""
    id: str
    therapist_id: str
    appointment_id: str
    patient_id: str
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    prescriptions: List[str] = Field(default_factory=list)
    exercises: List[str] = Field(default_factory=list)
    conclusion: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
