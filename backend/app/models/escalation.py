"""
Escalation models for the crisis/escalation module (Phase 8).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EscalationCreate(BaseModel):
    patient_id: str
    severity: str = "medium"  # low | medium | high | critical
    triggered_by: str = "chat_keyword"
    message: str = ""


class EscalationOut(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = ""
    severity: str = "medium"
    triggered_by: str = "chat_keyword"
    message: str = ""
    status: str = "open"  # open | acknowledged | resolved
    free_session_granted: bool = False
    acknowledged: bool = False
    created_at: str = ""


class BookOnBehalfRequest(BaseModel):
    therapist_id: str
    date: str
