"""
Crisis Detection Service

Detects crisis signals in user messages using:
1. Keyword matching (fast, reliable)
2. RoBERTa GoEmotions threshold (grief + fear + remorse combination)

Records events to `crisis_events` collection for therapist dashboard alerts.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from ..database import get_database
from ..models.memory import CrisisEvent

logger = logging.getLogger(__name__)

# Tiered keyword lists
_EMERGENCY_KEYWORDS = [
    "kill myself", "want to die", "end my life", "suicide", "suicidal",
    "take my life", "don't want to live", "don't want to be alive",
    "rather be dead", "better off dead", "no reason to live",
    "going to hurt myself", "going to kill", "ending it all",
]
_HIGH_KEYWORDS = [
    "self harm", "self-harm", "cut myself", "hurt myself", "hate myself",
    "can't go on", "can't take it anymore", "hopeless", "worthless",
    "nobody cares", "all alone", "no one cares", "nothing matters",
    "give up on life", "disappear forever",
]
_MODERATE_KEYWORDS = [
    "feeling empty", "want to disappear", "so depressed", "extremely anxious",
    "panic attack", "breaking down", "falling apart", "can't cope",
    "overwhelming sadness", "unbearable pain",
]

# GoEmotions: high-grief/remorse/fear combo threshold
_CRISIS_EMOTION_THRESHOLD = 0.6
_CRISIS_EMOTION_COMBOS = [
    {"grief", "remorse"},
    {"grief", "fear"},
    {"sadness", "fear", "remorse"},
    {"grief"},  # single high-confidence grief
]


class CrisisService:
    """Static-method service for crisis detection and event recording."""

    @staticmethod
    def detect_crisis(message: str, emotions: Optional[list] = None) -> dict:
        """
        Analyse a user message for crisis signals.

        Args:
            message: Raw user message text
            emotions: Optional list of RoBERTa emotion dicts
                      e.g. [{"label": "grief", "score": 0.87}, ...]

        Returns:
            {
                "is_crisis": bool,
                "severity": "none" | "moderate" | "high" | "emergency",
                "keywords_matched": [...],
                "emotions_detected": [...],
                "show_book_therapist": bool,
            }
        """
        msg_lower = message.lower()
        keywords_matched = []
        severity = "none"

        # Check keywords in priority order
        for kw in _EMERGENCY_KEYWORDS:
            if kw in msg_lower:
                keywords_matched.append(kw)
                severity = "emergency"
                break

        if severity == "none":
            for kw in _HIGH_KEYWORDS:
                if kw in msg_lower:
                    keywords_matched.append(kw)
                    severity = "high"
                    break

        if severity == "none":
            for kw in _MODERATE_KEYWORDS:
                if kw in msg_lower:
                    keywords_matched.append(kw)
                    severity = "moderate"
                    break

        # Check emotions (upgrade severity if emotion signals are strong)
        emotions_detected = []
        if emotions:
            high_emotions = {
                e["label"] for e in emotions
                if e.get("score", 0) >= _CRISIS_EMOTION_THRESHOLD
            }
            emotions_detected = list(high_emotions)
            for combo in _CRISIS_EMOTION_COMBOS:
                if combo.issubset(high_emotions):
                    if severity == "none":
                        severity = "moderate"
                    elif severity == "moderate":
                        severity = "high"
                    break

        is_crisis = severity != "none"
        show_book_therapist = severity in ("high", "emergency")

        return {
            "is_crisis": is_crisis,
            "severity": severity,
            "keywords_matched": keywords_matched,
            "emotions_detected": emotions_detected,
            "show_book_therapist": show_book_therapist,
        }

    @staticmethod
    async def record_crisis_event(
        user_id: str,
        message: str,
        severity: str,
        keywords_matched: Optional[list] = None,
        emotions_detected: Optional[list] = None,
    ) -> None:
        """Persist a crisis event, update risk level, and send alert email."""
        try:
            db = await get_database()
            event = CrisisEvent(
                user_id=user_id,
                message=message[:500],
                severity=severity,
                keywords_matched=keywords_matched or [],
                emotions_detected=emotions_detected or [],
            )
            await db.crisis_events.insert_one(event.model_dump())
            logger.warning(
                f"Crisis event recorded — user: {user_id}, severity: {severity}"
            )

            # Only send emails for high/emergency severity
            if severity in ("high", "emergency"):
                from bson import ObjectId
                from ..config import get_settings
                from .email_service import EmailService

                # Get patient info
                try:
                    patient_doc = await db.users.find_one({"_id": ObjectId(user_id)})
                except Exception:
                    patient_doc = None

                patient_name = (patient_doc or {}).get("full_name", "Unknown Patient")

                # Find assigned therapist (most recent confirmed appointment)
                therapist_doc = None
                therapist_email = None
                try:
                    appt = await db.appointments.find_one(
                        {"patient_id": user_id, "status": {"$in": ["confirmed", "pending"]}},
                        sort=[("created_at", -1)],
                    )
                    if appt:
                        therapist_doc = await db.users.find_one({"_id": ObjectId(str(appt.get("therapist_id", "")))})
                        therapist_email = (therapist_doc or {}).get("email")
                except Exception:
                    pass

                therapist_name = (therapist_doc or {}).get("full_name", "Team")
                settings = get_settings()
                admin_emails = [settings.admin_email] if settings.admin_email else []

                if therapist_email or admin_emails:
                    import asyncio
                    asyncio.create_task(EmailService.send_crisis_alert(
                        therapist_email=therapist_email or (admin_emails[0] if admin_emails else ""),
                        therapist_name=therapist_name,
                        patient_name=patient_name,
                        patient_id=user_id,
                        severity=severity,
                        message_excerpt=message[:300],
                        admin_emails=admin_emails if therapist_email else [],
                    ))

        except Exception as e:
            logger.error(f"Failed to record crisis event: {e}")

    @staticmethod
    async def get_recent_crisis_count(user_id: str, hours: int = 24) -> int:
        """Return count of crisis events for a user in the last N hours."""
        from datetime import timedelta
        db = await get_database()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return await db.crisis_events.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": cutoff},
        })
