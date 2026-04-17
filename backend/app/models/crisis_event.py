"""
Crisis Event Model for TheraAI
Records crisis detection events for therapist alerts
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class CrisisSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CrisisEventOut(BaseModel):
    """Schema for crisis event output"""
    id: Optional[str] = Field(default=None, alias="_id")
    patient_id: str
    patient_name: Optional[str] = None
    severity: CrisisSeverity
    trigger: str = Field(description="What triggered the crisis detection")
    source: str = Field(description="Source: chat, journal, etc.")
    message_excerpt: Optional[str] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict):
        """Create CrisisEventOut from MongoDB document"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            doc['_id'] = str(doc['_id'])
        return cls(**doc)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )
