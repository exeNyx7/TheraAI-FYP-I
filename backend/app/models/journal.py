"""
Journal Entry Models and Schemas for TheraAI Mood Tracking System
Includes mood tracking, sentiment analysis, and AI-generated empathy responses
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict, computed_field
from typing import Optional, Literal, Annotated, List, Dict, Any
from datetime import datetime, timezone
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
    Enhanced AI analysis result with dual-model output:
    - DistilBERT: Binary sentiment (positive/negative)
    - RoBERTa GoEmotions: Detailed emotions (28 categories)
    """
    # DistilBERT fields
    label: SentimentLabel = Field(description="Sentiment classification (positive/negative/neutral)")
    score: float = Field(ge=0.0, le=1.0, description="Confidence score for sentiment (0-1)")
    empathy_text: str = Field(description="AI-generated empathetic response based on sentiment")
    
    # RoBERTa GoEmotions fields
    emotion_themes: List[str] = Field(
        default_factory=list,
        description="User-friendly emotion themes (max 5)"
    )
    top_emotions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Top 3 detailed emotions with scores"
    )
    
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
                "empathy_text": "It sounds like you're experiencing something positive! That's wonderful to hear.",
                "emotion_themes": [
                    "Joy & Happiness",
                    "Optimism & Hope",
                    "Gratitude & Appreciation"
                ],
                "top_emotions": [
                    {"label": "joy", "score": 0.85},
                    {"label": "optimism", "score": 0.62},
                    {"label": "gratitude", "score": 0.45}
                ]
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
    Enhanced schema for journal entry output with emotion analysis
    Includes both DistilBERT sentiment and RoBERTa emotion data
    """
    id: Optional[str] = Field(default=None, alias="_id", description="Unique identifier")
    user_id: str = Field(description="ID of the user who created this entry")
    
    # DistilBERT sentiment fields
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
    
    # RoBERTa emotion fields
    emotion_themes: Optional[List[str]] = Field(
        default=None,
        description="User-friendly emotion themes from RoBERTa"
    )
    top_emotions: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Top emotions with confidence scores"
    )

    # Crisis detection fields
    crisis_detected: bool = Field(default=False, description="Whether crisis signals were found")
    crisis_severity: str = Field(default="none", description="none | moderate | high | emergency")

    # Groq-generated journal insight (on-demand via POST /journals/{id}/analyze)
    ai_insight: Optional[str] = Field(default=None, description="Empathetic AI reflection on the journal entry")
    ai_suggestion: Optional[str] = Field(default=None, description="Gentle coping suggestion from the AI")

    created_at: datetime = Field(description="Timestamp when entry was created")
    updated_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when entry was last updated"
    )
    
    @computed_field
    @property
    def ai_analysis(self) -> Optional[Dict[str, Any]]:
        """
        Computed property for frontend compatibility
        Maps backend fields to frontend ai_analysis structure
        """
        if self.sentiment_label is None:
            return None
        
        return {
            "sentiment": self.sentiment_label.value,
            "sentiment_score": self.sentiment_score,
            "summary": self.empathy_response,
            "themes": self.emotion_themes or [],
            "suggestions": self._generate_suggestions(),
            "top_emotions": self.top_emotions or []
        }
    
    def _generate_suggestions(self) -> List[str]:
        """Generate suggestions based on sentiment and emotions"""
        suggestions = []
        
        if self.sentiment_label == SentimentLabel.NEGATIVE:
            suggestions.extend([
                "Consider reaching out to a trusted friend or therapist",
                "Practice self-compassion and gentle self-talk",
                "Try a brief mindfulness or breathing exercise"
            ])
        elif self.sentiment_label == SentimentLabel.POSITIVE:
            suggestions.extend([
                "Take a moment to savor this positive experience",
                "Consider what contributed to these good feelings",
                "Share your joy with others who matter to you"
            ])
        else:
            suggestions.extend([
                "Take time to reflect on your emotional state",
                "Practice mindfulness to stay present",
                "Consider what small action might improve your day"
            ])
        
        return suggestions[:3]
    
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
        # Pydantic v2: Include computed fields like ai_analysis property
        from_attributes=True,
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
                "ai_analysis": {
                    "sentiment": "positive",
                    "sentiment_score": 0.9567,
                    "summary": "It sounds like you're experiencing something positive!",
                    "themes": ["Joy & Happiness"],
                    "suggestions": ["Take a moment to savor this positive experience"],
                    "top_emotions": [{"label": "joy", "score": 0.85}]
                },
                "created_at": "2025-12-01T10:30:00",
                "updated_at": None
            }
        }
    )


class JournalInDB(JournalBase):
    """
    Enhanced schema for journal entry in database
    Includes DistilBERT sentiment and RoBERTa emotion fields
    """
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = Field(description="ID of the user who created this entry")
    
    # DistilBERT fields
    sentiment_label: Optional[SentimentLabel] = None
    sentiment_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    empathy_response: Optional[str] = None
    
    # RoBERTa emotion fields
    emotion_themes: Optional[List[str]] = None
    top_emotions: Optional[List[Dict[str, Any]]] = None

    # Crisis detection fields
    crisis_detected: bool = False
    crisis_severity: str = "none"

    # Groq-generated journal insight
    ai_insight: Optional[str] = None
    ai_suggestion: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
