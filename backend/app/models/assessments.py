"""
Assessment Models and Schemas for TheraAI
Covers clinical screening tools (PHQ-9, GAD-7, PSS-10, WHO-5) and custom wellness checks.

Collections:
    assessments          — static template definitions (seeded once)
    assessment_results   — per-user submission records
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime


# ---------------------------------------------------------------------------
# Assessment template schemas (read-only from the client's perspective)
# ---------------------------------------------------------------------------

class AnswerOption(BaseModel):
    value: int
    label: str


class Question(BaseModel):
    id: int
    text: str
    options: List[AnswerOption]


class ScoringRange(BaseModel):
    min: int
    max: int
    label: str
    severity: Literal["low", "medium", "high", "critical"]


class Scoring(BaseModel):
    ranges: List[ScoringRange]


class AssessmentTemplate(BaseModel):
    """Returned when listing or fetching a single assessment template."""
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    slug: str
    category: Literal["clinical", "wellness"]
    description: str
    questions: List[Question]
    scoring: Scoring
    estimated_minutes: int
    is_active: bool = True

    model_config = ConfigDict(
        populate_by_name=True,
    )


class AssessmentListItem(BaseModel):
    """Lightweight item used in the list endpoint (no questions payload)."""
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    slug: str
    category: Literal["clinical", "wellness"]
    description: str
    estimated_minutes: int
    question_count: int

    model_config = ConfigDict(populate_by_name=True)


# ---------------------------------------------------------------------------
# Submission schemas
# ---------------------------------------------------------------------------

class AnswerSubmission(BaseModel):
    question_id: int
    value: int


class AssessmentSubmit(BaseModel):
    """Body sent by the client when submitting answers."""
    answers: List[AnswerSubmission] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Result schemas (stored in assessment_results collection)
# ---------------------------------------------------------------------------

class AssessmentResult(BaseModel):
    """Full result document returned after submission or when fetching history."""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    assessment_id: str
    assessment_slug: str
    assessment_name: str
    answers: List[AnswerSubmission]
    total_score: int
    max_possible_score: int
    percentage: float
    severity_label: str
    severity_level: Literal["low", "medium", "high", "critical"]
    ai_recommendation: str
    completed_at: datetime
    created_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()},
    )


class AssessmentResultSummary(BaseModel):
    """Compact version used in the history list."""
    id: Optional[str] = Field(default=None, alias="_id")
    assessment_slug: str
    assessment_name: str
    total_score: int
    max_possible_score: int
    severity_label: str
    severity_level: Literal["low", "medium", "high", "critical"]
    completed_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={datetime: lambda v: v.isoformat()},
    )
