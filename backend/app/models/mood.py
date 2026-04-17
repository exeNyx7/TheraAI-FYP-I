from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


VALID_MOODS = ['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'stressed', 'neutral']


class MoodType(str, Enum):
    """Valid mood options for mood entries"""
    HAPPY = "happy"
    SAD = "sad"
    ANXIOUS = "anxious"
    ANGRY = "angry"
    CALM = "calm"
    EXCITED = "excited"
    STRESSED = "stressed"
    NEUTRAL = "neutral"


class MoodModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    mood: str  # happy, sad, anxious, angry, calm, excited, stressed, neutral
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v: str) -> str:
        if v not in VALID_MOODS:
            raise ValueError(f"Invalid mood. Must be one of: {', '.join(VALID_MOODS)}")
        return v

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

    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_MOODS:
            raise ValueError(f"Invalid mood. Must be one of: {', '.join(VALID_MOODS)}")
        return v

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
