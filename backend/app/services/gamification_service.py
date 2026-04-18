"""
Gamification Service for TheraAI.
Handles XP, levels, streaks, and achievement unlocking.
All methods are defensive — never raise exceptions to callers.
"""

from datetime import datetime, timezone, date, timedelta
from typing import Optional
import logging

from bson import ObjectId

from ..database import get_database

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

XP_PER_LEVEL = 500   # Every 500 XP = 1 level

# Achievement catalog (matches frontend AchievementTracker)
ACHIEVEMENT_CATALOG = [
    {"id": "first_journal",      "title": "First Entry",          "xp": 50,  "check": "journals_count >= 1"},
    {"id": "journal_7",          "title": "Journaling Streak",     "xp": 100, "check": "journals_count >= 7"},
    {"id": "journal_30",         "title": "Dedicated Diarist",     "xp": 200, "check": "journals_count >= 30"},
    {"id": "first_mood",         "title": "Mood Mapper",           "xp": 50,  "check": "moods_count >= 1"},
    {"id": "mood_7",             "title": "Week of Moods",         "xp": 100, "check": "moods_count >= 7"},
    {"id": "streak_7",           "title": "7-Day Streak",          "xp": 150, "check": "streak_days >= 7"},
    {"id": "streak_30",          "title": "30-Day Streak",         "xp": 250, "check": "streak_days >= 30"},
    {"id": "first_assessment",   "title": "Self-Aware",            "xp": 75,  "check": "assessments_count >= 1"},
    {"id": "assessment_5",       "title": "Assessment Pro",        "xp": 150, "check": "assessments_count >= 5"},
    {"id": "first_chat",         "title": "Conversation Starter",  "xp": 50,  "check": "chat_count >= 1"},
    {"id": "chat_10",            "title": "Regular Chatter",       "xp": 100, "check": "chat_count >= 10"},
    {"id": "level_5",            "title": "Level 5 Explorer",      "xp": 200, "check": "level >= 5"},
]


# ─── Internal helpers ─────────────────────────────────────────────────────────

async def _get_user_doc(db, user_id: str) -> Optional[dict]:
    try:
        return await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


async def _update_user(db, user_id: str, update: dict):
    try:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update},
        )
    except Exception as e:
        logger.warning("Gamification _update_user failed: %s", e)


async def _count_docs(db, collection: str, user_id: str) -> int:
    try:
        return await db[collection].count_documents({"user_id": user_id})
    except Exception:
        return 0


# ─── Public API ───────────────────────────────────────────────────────────────

async def award_xp(user_id: str, amount: int) -> dict:
    """
    Add `amount` XP to a user and recompute their level.
    Returns { xp, level, xp_delta, level_up }.
    """
    try:
        db = await get_database()
        user = await _get_user_doc(db, user_id)
        if not user:
            return {}

        old_xp = int(user.get("xp", 0))
        old_level = int(user.get("level", 1))
        new_xp = old_xp + amount
        new_level = 1 + new_xp // XP_PER_LEVEL

        await _update_user(db, user_id, {"xp": new_xp, "level": new_level})

        return {
            "xp": new_xp,
            "level": new_level,
            "xp_delta": amount,
            "level_up": new_level > old_level,
        }
    except Exception as e:
        logger.warning("award_xp failed for %s: %s", user_id, e)
        return {}


async def update_streak(user_id: str) -> int:
    """
    Update the user's daily activity streak.
    Returns the new streak_days value.
    """
    try:
        db = await get_database()
        user = await _get_user_doc(db, user_id)
        if not user:
            return 0

        today = date.today()
        last_raw = user.get("last_active_date")

        if last_raw is None:
            new_streak = 1
        elif isinstance(last_raw, str):
            try:
                last_date = date.fromisoformat(last_raw)
            except ValueError:
                last_date = None
            if last_date == today:
                return int(user.get("streak_days", 1))
            elif last_date == today - timedelta(days=1):
                new_streak = int(user.get("streak_days", 0)) + 1
            else:
                new_streak = 1
        elif hasattr(last_raw, "date"):
            # datetime object from MongoDB
            last_date = last_raw.date() if hasattr(last_raw, "date") else last_raw
            if last_date == today:
                return int(user.get("streak_days", 1))
            elif last_date == today - timedelta(days=1):
                new_streak = int(user.get("streak_days", 0)) + 1
            else:
                new_streak = 1
        else:
            new_streak = 1

        await _update_user(db, user_id, {
            "streak_days": new_streak,
            "last_active_date": today.isoformat(),
        })
        return new_streak
    except Exception as e:
        logger.warning("update_streak failed for %s: %s", user_id, e)
        return 0


async def check_achievements(user_id: str) -> list[str]:
    """
    Check which achievements are newly unlocked for this user.
    Awards XP for each newly unlocked achievement.
    Returns list of newly unlocked achievement IDs.
    """
    try:
        db = await get_database()
        user = await _get_user_doc(db, user_id)
        if not user:
            return []

        already_unlocked = set(user.get("unlocked_achievements", []))
        streak_days = int(user.get("streak_days", 0))
        level = int(user.get("level", 1))

        # Fetch counts
        journals_count = await _count_docs(db, "journals", user_id)
        moods_count = await _count_docs(db, "moods", user_id)
        assessments_count = await _count_docs(db, "assessment_results", user_id)
        chat_count = await _count_docs(db, "chat_history", user_id)

        ctx = {
            "journals_count": journals_count,
            "moods_count": moods_count,
            "assessments_count": assessments_count,
            "chat_count": chat_count,
            "streak_days": streak_days,
            "level": level,
        }

        newly_unlocked = []
        bonus_xp = 0
        for ach in ACHIEVEMENT_CATALOG:
            aid = ach["id"]
            if aid in already_unlocked:
                continue
            # Evaluate the check expression safely
            try:
                if eval(ach["check"], {}, ctx):  # noqa: S307
                    newly_unlocked.append(aid)
                    bonus_xp += ach.get("xp", 50)
            except Exception:
                pass

        if newly_unlocked:
            new_unlocked_list = list(already_unlocked) + newly_unlocked
            await _update_user(db, user_id, {"unlocked_achievements": new_unlocked_list})
            if bonus_xp > 0:
                await award_xp(user_id, bonus_xp)

        return newly_unlocked
    except Exception as e:
        logger.warning("check_achievements failed for %s: %s", user_id, e)
        return []


async def get_gamification_summary(user_id: str) -> dict:
    """
    Return full gamification summary for a user.
    """
    try:
        db = await get_database()
        user = await _get_user_doc(db, user_id)
        if not user:
            return {}

        xp = int(user.get("xp", 0))
        level = int(user.get("level", 1))
        streak_days = int(user.get("streak_days", 0))
        unlocked = user.get("unlocked_achievements", [])
        next_level_xp = (level) * XP_PER_LEVEL  # XP needed to reach next level
        xp_in_current_level = xp - (level - 1) * XP_PER_LEVEL

        return {
            "xp": xp,
            "level": level,
            "streak_days": streak_days,
            "unlocked_achievements": unlocked,
            "next_level_xp": next_level_xp,
            "xp_in_current_level": xp_in_current_level,
            "xp_per_level": XP_PER_LEVEL,
        }
    except Exception as e:
        logger.warning("get_gamification_summary failed for %s: %s", user_id, e)
        return {}


async def get_achievement_catalog(user_id: str) -> list[dict]:
    """
    Return full achievement catalog with unlocked flags.
    """
    try:
        db = await get_database()
        user = await _get_user_doc(db, user_id)
        unlocked = set(user.get("unlocked_achievements", []) if user else [])

        return [
            {
                "id": a["id"],
                "title": a["title"],
                "xp": a["xp"],
                "unlocked": a["id"] in unlocked,
            }
            for a in ACHIEVEMENT_CATALOG
        ]
    except Exception as e:
        logger.warning("get_achievement_catalog failed for %s: %s", user_id, e)
        return []
