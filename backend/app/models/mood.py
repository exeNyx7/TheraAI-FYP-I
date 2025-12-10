from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MoodModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    mood: str  # happy, sad, anxious, angry, calm, excited, stressed, neutral
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "mood": "happy",
                "notes": "Feeling great today!",
                "timestamp": "2025-12-11T10:00:00Z"
            }
        }


class MoodCreate(BaseModel):
    mood: str
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "mood": "happy",
                "notes": "Feeling great today!",
                "timestamp": "2025-12-11T10:00:00Z"
            }
        }


class MoodUpdate(BaseModel):
    mood: Optional[str] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "mood": "calm",
                "notes": "Updated mood entry"
            }
        }


class MoodResponse(BaseModel):
    id: str
    user_id: str
    mood: str
    notes: Optional[str] = None
    timestamp: datetime
    created_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "user_id": "user123",
                "mood": "happy",
                "notes": "Feeling great today!",
                "timestamp": "2025-12-11T10:00:00Z",
                "created_at": "2025-12-11T10:00:00Z"
            }
        }
