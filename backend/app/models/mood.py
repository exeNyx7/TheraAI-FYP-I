from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


VALID_MOODS = ['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'stressed', 'neutral']


class MoodType(str, Enum):
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
    mood: str
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(populate_by_name=True)


class MoodCreate(BaseModel):
    mood: str
    intensity: Optional[int] = Field(default=3, ge=1, le=5)
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None

    @field_validator('mood')
    @classmethod
    def validate_mood(cls, v: str) -> str:
        if v not in VALID_MOODS:
            raise ValueError(f"Invalid mood. Must be one of: {', '.join(VALID_MOODS)}")
        return v


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


class MoodResponse(BaseModel):
    id: str
    user_id: str
    mood: str
    intensity: Optional[int] = 3
    notes: Optional[str] = None
    timestamp: datetime
    created_at: datetime
