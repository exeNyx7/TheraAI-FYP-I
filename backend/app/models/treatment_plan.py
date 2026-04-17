"""
Treatment Plan Models for TheraAI Backend
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class TreatmentPlanCreate(BaseModel):
    """Schema for creating a treatment plan"""
    patient_id: str = Field(..., description="Patient user ID")
    title: str = Field(..., min_length=1, max_length=300)
    goals: List[str] = Field(default_factory=list)
    interventions: List[str] = Field(default_factory=list)
    status: str = Field(default="active")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": "507f1f77bcf86cd799439011",
                "title": "CBT for Generalized Anxiety",
                "goals": ["Reduce daily worry", "Improve sleep"],
                "interventions": ["Weekly CBT sessions", "Breathing exercises"],
                "status": "active",
            }
        }
    )


class TreatmentPlanUpdate(BaseModel):
    """Schema for updating a treatment plan (all fields optional)"""
    title: Optional[str] = Field(default=None, max_length=300)
    goals: Optional[List[str]] = None
    interventions: Optional[List[str]] = None
    status: Optional[str] = None


class TreatmentPlanOut(BaseModel):
    """Schema for returning a treatment plan"""
    id: str
    therapist_id: str
    patient_id: str
    title: str
    goals: List[str] = Field(default_factory=list)
    interventions: List[str] = Field(default_factory=list)
    status: str = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
