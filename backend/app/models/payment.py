"""
Payment Models for TheraAI Freemium System
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SubscriptionTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    INTENSIVE = "intensive"


PLAN_DETAILS = {
    "free": {
        "name": "Free",
        "price_pkr": 0,
        "sessions_per_month": 1,
        "session_duration": 15,
        "description": "One-time 15-min intro session",
        "features": ["1 intro session (15 min)", "AI chat assistant", "Mood tracking", "Journal"],
    },
    "starter": {
        "name": "Starter",
        "price_pkr": 2499,
        "sessions_per_month": 2,
        "session_duration": 25,
        "description": "2 sessions/month, 25 min each",
        "features": ["2 sessions/month (25 min each)", "AI chat assistant", "Mood tracking", "Journal", "Assessments"],
    },
    "professional": {
        "name": "Professional",
        "price_pkr": 4499,
        "sessions_per_month": 4,
        "session_duration": 25,
        "description": "4 sessions/month, 25 min each",
        "features": ["4 sessions/month (25 min each)", "Priority therapist matching", "AI chat assistant", "Full feature access"],
    },
    "intensive": {
        "name": "Intensive",
        "price_pkr": 7999,
        "sessions_per_month": 8,
        "session_duration": 30,
        "description": "8 sessions/month, 30 min each",
        "features": ["8 sessions/month (30 min each)", "Priority support", "Dedicated therapist", "Full feature access"],
    },
}


class BookSessionRequest(BaseModel):
    therapist_id: str
    scheduled_at: datetime
    duration_minutes: int = Field(default=25, description="Must be 15, 25, or 30")


class SubscribeRequest(BaseModel):
    tier: SubscriptionTier


class PlanInfo(BaseModel):
    tier: str
    status: str
    sessions_remaining: int
    sessions_used_total: int
    renews_at: Optional[datetime] = None
    free_intro_used: bool


class BookSessionResponse(BaseModel):
    confirmed: bool = False
    checkout_url: Optional[str] = None
    appointment_id: Optional[str] = None
    message: Optional[str] = None
