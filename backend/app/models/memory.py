"""
User Memory Models for AI Cross-Session Persistence

Stores distilled facts about each user learned from chat conversations,
journal entries, and mood data. Injected into the LLM system prompt so
the AI feels like it remembers the user across sessions.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone


class UserMemory(BaseModel):
    """Persistent memory record for a single user"""
    user_id: str
    facts: List[str] = Field(
        default_factory=list,
        description="Key facts about the user extracted from conversations "
                    "(e.g., 'User is a 25yo student', 'Struggles with exam anxiety')"
    )
    detected_patterns: List[str] = Field(
        default_factory=list,
        description="Recurring issues detected across sessions "
                    "(e.g., 'recurring sleep issues', 'social withdrawal')"
    )
    risk_level: Literal["low", "moderate", "high", "crisis"] = Field(
        default="low",
        description="Current risk assessment based on recent sentiment history"
    )
    session_count: int = Field(default=0, description="Total chat sessions tracked")
    last_updated: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    @classmethod
    def from_doc(cls, doc: dict) -> "UserMemory":
        if doc and "_id" in doc:
            del doc["_id"]
        return cls(**doc)


class CrisisEvent(BaseModel):
    """A recorded crisis detection event"""
    user_id: str
    message: str = Field(description="The message that triggered crisis detection")
    severity: Literal["moderate", "high", "emergency"] = Field(
        description="Crisis severity level"
    )
    keywords_matched: List[str] = Field(default_factory=list)
    emotions_detected: List[str] = Field(default_factory=list)
    therapist_notified: bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
