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
        """
        Persist a crisis event with guaranteed fallback delivery:
          1. Always writes to crisis_events
          2. Always writes to escalations (therapist dashboard)
          3. Always writes in-app notification for assigned therapist / admin
          4. Tries email only if MAIL_ENABLED=True
          5. Prints bright red console alert when DEMO_MODE=True
        """
        try:
            from bson import ObjectId
            from ..config import get_settings
            settings = get_settings()

            db = await get_database()
            now = datetime.now(timezone.utc)

            # ── 1. crisis_events ──────────────────────────────────────────────
            event = CrisisEvent(
                user_id=user_id,
                message=message[:500],
                severity=severity,
                keywords_matched=keywords_matched or [],
                emotions_detected=emotions_detected or [],
            )
            await db.crisis_events.insert_one(event.model_dump())

            # ── 2. Resolve patient info ───────────────────────────────────────
            patient_doc = None
            try:
                patient_doc = await db.users.find_one({"_id": ObjectId(user_id)})
            except Exception:
                pass
            patient_name = (patient_doc or {}).get("full_name", "Unknown Patient")

            # ── 3. escalations collection ─────────────────────────────────────
            trigger_desc = ", ".join(
                (keywords_matched or []) + (emotions_detected or []) or [severity]
            )
            esc_result = await db.escalations.insert_one({
                "patient_id": user_id,
                "severity": severity,
                "triggered_by": "ai_crisis_detection",
                "message": message[:500],
                "trigger": trigger_desc,
                "status": "open",
                "free_session_granted": False,
                "acknowledged": False,
                "created_at": now,
            })
            esc_id = str(esc_result.inserted_id)

            # ── 4. Notify ALL active therapists + admins ──────────────────────
            severity_emoji = {"emergency": "🚨", "high": "⚠️", "moderate": "⚡"}.get(severity, "ℹ️")
            notif_doc_base = {
                "type": "crisis_alert",
                "title": f"{severity_emoji} Crisis Alert — {severity.upper()}",
                "body": f"Patient {patient_name} needs attention. Trigger: {trigger_desc[:100]}",
                "patient_id": user_id,
                "escalation_id": esc_id,
                "severity": severity,
                "read": False,
                "created_at": now,
            }

            staff_emails: list[str] = []
            try:
                staff_cursor = db.users.find(
                    {"role": {"$in": ["psychiatrist", "therapist", "admin"]}, "is_active": True},
                    {"_id": 1, "email": 1, "full_name": 1, "role": 1},
                )
                async for staff in staff_cursor:
                    staff_id = str(staff["_id"])
                    # In-app bell notification
                    await db.notifications.insert_one({**notif_doc_base, "user_id": staff_id})
                    # Collect therapist emails for email delivery
                    if staff.get("role") in ("psychiatrist", "therapist") and staff.get("email"):
                        staff_emails.append(staff["email"])
            except Exception as e:
                logger.error(f"Failed to notify staff: {e}")

            # ── 5. WARNING log (always) ───────────────────────────────────────
            logger.warning(
                "CRISIS ALERT: %s — severity=%s — email_enabled=%s, "
                "escalation + in-app notifications created (staff count=%d)",
                user_id, severity, settings.mail_enabled, len(staff_emails),
            )

            # ── 6. DEMO_MODE: bright red console output ───────────────────────
            if settings.demo_mode:
                _RED = "\033[91m"
                _BOLD = "\033[1m"
                _RST = "\033[0m"
                print(
                    f"\n{_RED}{_BOLD}"
                    f"╔══════════════════════════════════════════════════╗\n"
                    f"║  🚨 CRISIS ALERT [{severity.upper():^10}]"
                    f"                   ║\n"
                    f"║  Patient : {patient_name:<38}║\n"
                    f"║  ID      : {user_id[:8]+'...':<38}║\n"
                    f"║  Trigger : {trigger_desc[:38]:<38}║\n"
                    f"║  Message : {message[:38]+'...':<38}║\n"
                    f"║  Notif   : {'SENT TO ALL STAFF':<38}║\n"
                    f"║  Email   : {'QUEUED' if (settings.mail_enabled and staff_emails) else 'DISABLED':<38}║\n"
                    f"╚══════════════════════════════════════════════════╝"
                    f"{_RST}\n"
                )

            # ── 7. Email — therapists only, high/emergency, MAIL_ENABLED ──────
            if severity in ("high", "emergency") and settings.mail_enabled and staff_emails:
                from .email_service import EmailService
                import asyncio
                for to_email in staff_emails:
                    asyncio.create_task(EmailService.send_crisis_alert(
                        to_email=to_email,
                        therapist_name="Care Team",
                        patient_name=patient_name,
                        severity=severity,
                        trigger=trigger_desc,
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
