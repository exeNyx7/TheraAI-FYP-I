"""
Device Token Model for TheraAI Push Notifications (FCM)
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class DeviceType(str, Enum):
    WEB = "web"
    ANDROID = "android"
    IOS = "ios"


class DeviceTokenRegister(BaseModel):
    """Schema for registering a device token"""
    token: str = Field(..., min_length=1, description="FCM registration token")
    device_type: DeviceType = Field(default=DeviceType.WEB, description="Device platform")


class DeviceTokenInDB(BaseModel):
    """Schema for device token in database"""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    token: str
    device_type: DeviceType = DeviceType.WEB
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda v: v.isoformat()}
    )
