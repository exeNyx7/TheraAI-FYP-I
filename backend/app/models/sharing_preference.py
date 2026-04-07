"""Sharing preference models - what patient agrees to share for a given appointment."""

from typing import Optional
from pydantic import BaseModel


class SharingPreferenceCreate(BaseModel):
    appointment_id: str
    share_mood: bool = True
    share_emotions: bool = True
    share_demographics: bool = False
    share_journal: bool = False
    share_assessments: bool = False


class SharingPreferenceOut(BaseModel):
    id: str
    patient_id: str
    appointment_id: str
    share_mood: bool = True
    share_emotions: bool = True
    share_demographics: bool = False
    share_journal: bool = False
    share_assessments: bool = False
    created_at: Optional[str] = None
