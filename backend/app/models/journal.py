"""
Journal Entry Models and Schemas for TheraAI Mood Tracking System
Includes mood tracking, sentiment analysis, and AI-generated empathy responses
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Literal, Annotated
from datetime import datetime
from bson import ObjectId
from enum import Enum


# Mood type enumeration for user self-reported mood
class MoodType(str, Enum):
    """User-selectable mood types for journal entries"""
    HAPPY = "happy"
    SAD = "sad"
    ANXIOUS = "anxious"
    ANGRY = "angry"
    CALM = "calm"
    EXCITED = "excited"
    STRESSED = "stressed"
    NEUTRAL = "neutral"


# Sentiment label from AI analysis
class SentimentLabel(str, Enum):
    """AI-determined sentiment labels from text analysis"""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


# Type alias for ObjectId validation
PyObjectId = Annotated[str, Field(description="MongoDB ObjectId")]


class AIAnalysisResult(BaseModel):
    """
    Result from AI sentiment analysis
    Contains sentiment classification and empathy response
    """
    label: SentimentLabel = Field(description="Sentiment classification (positive/negative/neutral)")
    score: float = Field(ge=0.0, le=1.0, description="Confidence score for sentiment (0-1)")
    empathy_text: str = Field(description="AI-generated empathetic response based on sentiment")
    
    @field_validator("score")
    @classmethod
    def validate_score(cls, v):
        """Ensure score is between 0 and 1"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Sentiment score must be between 0 and 1")
        return round(v, 4)  # Round to 4 decimal places
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "label": "positive",
                "score": 0.9234,
                "empathy_text": "It sounds like you're experiencing something positive! That's wonderful to hear."
            }
        }
    )


class JournalBase(BaseModel):
    """Base journal entry model with common fields"""
    content: str = Field(
        ..., 
        min_length=10, 
        max_length=5000,
        description="Journal entry text content"
    )
    mood: MoodType = Field(description="User-selected mood for this entry")
    title: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Optional title for the journal entry"
    )
    day_of_week: Optional[str] = Field(
        default=None,
        description="Day of week when journal was created (Monday, Tuesday, etc.)"
    )
    
    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        """Validate content is not just whitespace"""
        if not v.strip():
            raise ValueError("Journal content cannot be empty or just whitespace")
        if len(v.strip()) < 10:
            raise ValueError("Journal content must be at least 10 characters long")
        return v.strip()
    
    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        """Validate title if provided"""
        if v is not None:
            v = v.strip()
            if not v:
                return None  # Return None for empty strings
            if len(v) > 200:
                raise ValueError("Title must be 200 characters or less")
        return v


class JournalCreate(JournalBase):
    """Schema for creating a new journal entry (user input)"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "Today was a wonderful day! I accomplished all my goals and felt really productive. Everything went smoothly and I'm feeling very optimistic about the future.",
                "mood": "happy",
                "title": "Productive and Happy Day",
                "day_of_week": "Wednesday"
            }
        }
    )


class JournalOut(JournalBase):
    """
    Schema for journal entry output (API responses)
    Includes AI analysis results and metadata
    """
    id: Optional[str] = Field(default=None, alias="_id", description="Unique identifier")
    user_id: str = Field(description="ID of the user who created this entry")
    sentiment_label: Optional[SentimentLabel] = Field(
        default=None,
        description="AI-determined sentiment (positive/negative/neutral)"
    )
    sentiment_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence score for sentiment analysis"
    )
    empathy_response: Optional[str] = Field(
        default=None,
        description="AI-generated empathetic response"
    )
    created_at: datetime = Field(description="Timestamp when entry was created")
    updated_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when entry was last updated"
    )
    
    @classmethod
    def from_doc(cls, doc: dict):
        """Create JournalOut from MongoDB document"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            doc['_id'] = str(doc['_id'])  # Convert ObjectId to string for pydantic
        return cls(**doc)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        },
        json_schema_extra={
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "user_id": "507f1f77bcf86cd799439012",
                "content": "Today was a great day! I accomplished all my goals and felt really productive.",
                "mood": "happy",
                "title": "Productive Day",
                "sentiment_label": "positive",
                "sentiment_score": 0.9567,
                "empathy_response": "It sounds like you're experiencing something positive! That's wonderful to hear. Keep up the great work!",
                "created_at": "2025-12-01T10:30:00",
                "updated_at": None
            }
        }
    )


class JournalInDB(JournalBase):
    """
    Schema for journal entry in database
    Includes all fields stored in MongoDB
    """
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = Field(description="ID of the user who created this entry")
    sentiment_label: Optional[SentimentLabel] = None
    sentiment_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    empathy_response: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_doc(cls, doc: dict):
        """Create JournalInDB from MongoDB document"""
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
        return cls(**doc)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    )


class JournalUpdate(BaseModel):
    """Schema for updating an existing journal entry"""
    content: Optional[str] = Field(
        default=None,
        min_length=10,
        max_length=5000
    )
    mood: Optional[MoodType] = None
    title: Optional[str] = Field(default=None, max_length=200)
    
    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        """Validate content if provided"""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Content cannot be empty")
            if len(v) < 10:
                raise ValueError("Content must be at least 10 characters")
        return v
    
    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        """Validate title if provided"""
        if v is not None:
            v = v.strip()
            if len(v) > 200:
                raise ValueError("Title must be 200 characters or less")
        return v if v else None


class MoodStatistics(BaseModel):
    """Statistics about user's mood patterns"""
    total_entries: int = Field(description="Total number of journal entries")
    mood_counts: dict[MoodType, int] = Field(description="Count of each mood type")
    sentiment_distribution: dict[SentimentLabel, int] = Field(
        description="Distribution of sentiment labels"
    )
    average_sentiment_score: Optional[float] = Field(
        default=None,
        description="Average sentiment score across all entries"
    )
    most_common_mood: Optional[MoodType] = Field(
        default=None,
        description="Most frequently selected mood"
    )
    recent_trend: Optional[str] = Field(
        default=None,
        description="Recent mood trend description"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_entries": 25,
                "mood_counts": {
                    "happy": 10,
                    "calm": 8,
                    "anxious": 4,
                    "neutral": 3
                },
                "sentiment_distribution": {
                    "positive": 15,
                    "neutral": 7,
                    "negative": 3
                },
                "average_sentiment_score": 0.7234,
                "most_common_mood": "happy",
                "recent_trend": "improving"
            }
        }
    )
