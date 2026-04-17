"""
Assessments API Router for TheraAI
Handles clinical screening tools (PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check).

Endpoints:
    GET  /assessments                        — list active assessment templates
    GET  /assessments/history                — authenticated user's result history
    GET  /assessments/history/{result_id}    — single detailed result
    GET  /assessments/{slug}                 — fetch template with questions
    POST /assessments/{slug}/submit          — submit answers, score, generate recommendation

NOTE: /history routes MUST be registered before /{slug} to avoid FastAPI
matching "history" as a slug parameter.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..models.assessments import (
    AssessmentListItem,
    AssessmentTemplate,
    AssessmentSubmit,
    AssessmentResult,
    AssessmentResultSummary,
)
from ..services.assessments_service import AssessmentsService

router = APIRouter(prefix="/assessments", tags=["Assessments"])


@router.get(
    "",
    response_model=List[AssessmentListItem],
    summary="List active assessments",
    description="Returns all active clinical and wellness assessment templates (without questions).",
)
async def list_assessments(
    _: UserOut = Depends(get_current_user),
) -> List[AssessmentListItem]:
    return await AssessmentsService.list_assessments()


# ---- History routes registered BEFORE /{slug} ----

@router.get(
    "/history",
    response_model=List[AssessmentResultSummary],
    summary="Get assessment history",
    description="Returns the current user's completed assessments, newest first.",
)
async def get_history(
    current_user: UserOut = Depends(get_current_user),
) -> List[AssessmentResultSummary]:
    return await AssessmentsService.get_history(current_user.id)


@router.get(
    "/history/{result_id}",
    response_model=AssessmentResult,
    summary="Get a single result",
    description="Returns detailed result for one completed assessment submission.",
)
async def get_result(
    result_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> AssessmentResult:
    result = await AssessmentsService.get_result(current_user.id, result_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return result


# ---- Template routes ----

@router.get(
    "/{slug}",
    response_model=AssessmentTemplate,
    summary="Get assessment template",
    description="Returns a single assessment template including all questions and answer options.",
)
async def get_assessment(
    slug: str,
    _: UserOut = Depends(get_current_user),
) -> AssessmentTemplate:
    template = await AssessmentsService.get_assessment(slug)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Assessment '{slug}' not found")
    return template


@router.post(
    "/{slug}/submit",
    response_model=AssessmentResult,
    status_code=status.HTTP_201_CREATED,
    summary="Submit assessment answers",
    description="Submit answers for scoring. Returns computed score, severity, and AI-generated recommendation.",
)
async def submit_assessment(
    slug: str,
    submission: AssessmentSubmit,
    current_user: UserOut = Depends(get_current_user),
) -> AssessmentResult:
    try:
        return await AssessmentsService.submit_assessment(current_user.id, slug, submission)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
