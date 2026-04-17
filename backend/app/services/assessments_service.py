"""
Assessments Service for TheraAI
Handles scoring logic, AI recommendation generation, and result persistence.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId

from ..database import get_database
from ..models.assessments import (
    AssessmentTemplate,
    AssessmentListItem,
    AssessmentSubmit,
    AssessmentResult,
    AssessmentResultSummary,
    ScoringRange,
)
from ..models.journal import SentimentLabel


def _score_assessment(
    answers: list,
    scoring_ranges: List[ScoringRange],
    max_possible: int,
) -> tuple[int, float, str, str]:
    """
    Compute total score and derive severity from the template's scoring ranges.

    Returns:
        (total_score, percentage, severity_label, severity_level)
    """
    total = sum(a["value"] for a in answers)
    percentage = round((total / max_possible) * 100, 1) if max_possible > 0 else 0.0

    severity_label = "Unknown"
    severity_level = "low"
    for r in scoring_ranges:
        if r["min"] <= total <= r["max"]:
            severity_label = r["label"]
            severity_level = r["severity"]
            break

    return total, percentage, severity_label, severity_level


def _generate_recommendation(
    assessment_name: str,
    severity_label: str,
    severity_level: str,
    total_score: int,
    max_possible: int,
) -> str:
    """
    Template-based recommendation generator.
    Uses local logic so there are no API costs. Can be swapped for GPT later.
    """
    base = f"Based on your {assessment_name} result, your score of {total_score}/{max_possible} indicates **{severity_label}** symptoms."

    tips: dict[str, str] = {
        "low": (
            " Great work maintaining your mental wellness! Keep up your healthy habits — "
            "regular exercise, good sleep, and social connection all help sustain this positive baseline. "
            "Consider journaling regularly to stay in tune with your emotions."
        ),
        "medium": (
            " This is a good time to strengthen your self-care routine. "
            "Try incorporating mindfulness or breathing exercises into your daily schedule. "
            "Talking to a trusted friend or counsellor can also provide relief."
        ),
        "high": (
            " We encourage you to reach out to a mental health professional. "
            "Your feelings are valid, and support is available. "
            "In the meantime, try to maintain a regular sleep schedule and limit stressors where possible."
        ),
        "critical": (
            " Please consider speaking with a mental health professional as soon as possible. "
            "If you are in crisis, contact a helpline in your country immediately. "
            "You are not alone — help is available and things can get better with the right support."
        ),
    }

    return base + tips.get(severity_level, "")


class AssessmentsService:

    @staticmethod
    async def list_assessments() -> List[AssessmentListItem]:
        db = await get_database()
        cursor = db.assessments.find({"is_active": True})
        items = []
        async for doc in cursor:
            items.append(
                AssessmentListItem(
                    **{
                        "_id": str(doc["_id"]),
                        "name": doc["name"],
                        "slug": doc["slug"],
                        "category": doc["category"],
                        "description": doc["description"],
                        "estimated_minutes": doc["estimated_minutes"],
                        "question_count": len(doc.get("questions", [])),
                    }
                )
            )
        return items

    @staticmethod
    async def get_assessment(slug: str) -> Optional[AssessmentTemplate]:
        db = await get_database()
        doc = await db.assessments.find_one({"slug": slug, "is_active": True})
        if doc is None:
            return None
        doc["_id"] = str(doc["_id"])
        return AssessmentTemplate(**doc)

    @staticmethod
    async def submit_assessment(
        user_id: str,
        slug: str,
        submission: AssessmentSubmit,
    ) -> AssessmentResult:
        db = await get_database()

        template_doc = await db.assessments.find_one({"slug": slug, "is_active": True})
        if template_doc is None:
            raise ValueError(f"Assessment '{slug}' not found")

        questions = template_doc.get("questions", [])
        max_possible = sum(max(o["value"] for o in q["options"]) for q in questions)
        scoring_ranges = template_doc["scoring"]["ranges"]

        answers_raw = [a.model_dump() for a in submission.answers]

        total_score, percentage, severity_label, severity_level = _score_assessment(
            answers_raw, scoring_ranges, max_possible
        )

        recommendation = _generate_recommendation(
            template_doc["name"], severity_label, severity_level, total_score, max_possible
        )

        now = datetime.now(timezone.utc)
        result_doc = {
            "user_id": user_id,
            "assessment_id": str(template_doc["_id"]),
            "assessment_slug": slug,
            "assessment_name": template_doc["name"],
            "answers": answers_raw,
            "total_score": total_score,
            "max_possible_score": max_possible,
            "percentage": percentage,
            "severity_label": severity_label,
            "severity_level": severity_level,
            "ai_recommendation": recommendation,
            "completed_at": now,
            "created_at": now,
        }

        insert_result = await db.assessment_results.insert_one(result_doc)
        result_doc["_id"] = str(insert_result.inserted_id)

        # Fire-and-forget gamification (non-blocking)
        import asyncio
        async def _award():
            try:
                from .gamification_service import award_xp, check_achievements
                await award_xp(user_id, 50)
                await check_achievements(user_id)
            except Exception:
                pass
        asyncio.create_task(_award())

        return AssessmentResult(**result_doc)

    @staticmethod
    async def get_history(user_id: str, limit: int = 20) -> List[AssessmentResultSummary]:
        db = await get_database()
        cursor = (
            db.assessment_results.find({"user_id": user_id})
            .sort("completed_at", -1)
            .limit(limit)
        )
        results = []
        async for doc in cursor:
            results.append(
                AssessmentResultSummary(
                    **{
                        "_id": str(doc["_id"]),
                        "assessment_slug": doc["assessment_slug"],
                        "assessment_name": doc["assessment_name"],
                        "total_score": doc["total_score"],
                        "max_possible_score": doc["max_possible_score"],
                        "severity_label": doc["severity_label"],
                        "severity_level": doc["severity_level"],
                        "completed_at": doc["completed_at"],
                    }
                )
            )
        return results

    @staticmethod
    async def get_result(user_id: str, result_id: str) -> Optional[AssessmentResult]:
        db = await get_database()
        if not ObjectId.is_valid(result_id):
            return None
        doc = await db.assessment_results.find_one(
            {"_id": ObjectId(result_id), "user_id": user_id}
        )
        if doc is None:
            return None
        doc["_id"] = str(doc["_id"])
        return AssessmentResult(**doc)
