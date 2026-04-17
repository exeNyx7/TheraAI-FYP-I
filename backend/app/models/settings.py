"""
Settings Models and Schemas for TheraAI
Handles user preferences persisted server-side in the user_settings collection.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime


class NotificationPreferences(BaseModel):
    email: bool = True
    push: bool = True
    appointments: bool = True
    insights: bool = True


class PrivacyPreferences(BaseModel):
    share_with_therapist: bool = True


class UserSettings(BaseModel):
    """Full settings document returned from the database."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    theme: Literal["light", "dark", "system"] = "system"
    notifications: NotificationPreferences = Field(default_factory=NotificationPreferences)
    privacy: PrivacyPreferences = Field(default_factory=PrivacyPreferences)
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()},
    )


class UserSettingsUpdate(BaseModel):
    """Partial update schema — all fields optional so clients send only what changed."""
    theme: Optional[Literal["light", "dark", "system"]] = None
    notifications: Optional[NotificationPreferences] = None
    privacy: Optional[PrivacyPreferences] = None


class UserSettingsOut(BaseModel):
    """Response shape for settings endpoints."""
    user_id: str
    theme: Literal["light", "dark", "system"]
    notifications: NotificationPreferences
    privacy: PrivacyPreferences
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()},
    )
