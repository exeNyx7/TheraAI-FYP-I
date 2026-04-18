import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List

from ..models.mood import MoodCreate, MoodUpdate, MoodResponse
from ..models.user import UserOut
from ..dependencies.auth import get_current_user
from ..services.mood_service import mood_service

router = APIRouter(prefix="/moods", tags=["moods"])

# Moods that indicate high distress and should trigger a crisis check
_CRISIS_MOODS = {"sad", "anxious", "stressed", "angry"}
# Consecutive crisis-level moods needed to fire an escalation
_CRISIS_MOOD_THRESHOLD = 3


_CRISIS_COOLDOWN_HOURS = 4  # minimum hours between escalations for the same user


async def _check_mood_escalation(user_id: str, current_mood: str) -> None:
    """Fire-and-forget: if last N moods are all crisis-level AND no recent escalation, record one."""
    try:
        from ..database import get_database
        from ..services.crisis_service import CrisisService
        from datetime import datetime, timezone, timedelta

        db = await get_database()

        # Check cooldown: skip if a crisis event was already recorded within the window
        cooldown_cutoff = datetime.now(timezone.utc) - timedelta(hours=_CRISIS_COOLDOWN_HOURS)
        existing = await db.crisis_events.find_one(
            {"user_id": user_id, "created_at": {"$gte": cooldown_cutoff}}
        )
        if existing:
            return  # already escalated recently — don't spam

        recent = await db.moods.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(_CRISIS_MOOD_THRESHOLD).to_list(length=_CRISIS_MOOD_THRESHOLD)

        if len(recent) < _CRISIS_MOOD_THRESHOLD:
            return
        if all(m.get("mood", "").lower() in _CRISIS_MOODS for m in recent):
            await CrisisService.record_crisis_event(
                user_id=user_id,
                message=f"Persistent low mood detected: {[m.get('mood') for m in recent]}",
                severity="moderate",
                keywords_matched=[],
                emotions_detected=[current_mood],
            )
    except Exception:
        pass  # non-blocking; errors must not affect the mood save response


@router.post("", response_model=MoodResponse, status_code=status.HTTP_201_CREATED)
async def create_mood(
    mood_data: MoodCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new mood entry"""
    mood = await mood_service.create_mood(current_user.id, mood_data)

    # Fire mood-based escalation check if mood is crisis-level (non-blocking)
    if mood_data.mood and mood_data.mood.lower() in _CRISIS_MOODS:
        asyncio.create_task(_check_mood_escalation(str(current_user.id), mood_data.mood))

    return MoodResponse(
        id=mood["_id"],
        user_id=mood["user_id"],
        mood=mood["mood"],
        intensity=mood.get("intensity", 3),
        notes=mood.get("notes"),
        timestamp=mood.get("timestamp") or mood.get("created_at"),
        created_at=mood.get("created_at") or mood.get("timestamp"),
    )


@router.get("", response_model=List[MoodResponse])
async def get_moods(
    limit: int = Query(30, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: UserOut = Depends(get_current_user)
):
    """Get mood history for the current user"""
    moods = await mood_service.get_user_moods(current_user.id, limit, skip)
    
    return [
        MoodResponse(
            id=mood["_id"],
            user_id=mood["user_id"],
            mood=mood["mood"],
            intensity=mood.get("intensity", 3),
            notes=mood.get("notes"),
            timestamp=mood.get("timestamp") or mood.get("created_at"),
            created_at=mood.get("created_at") or mood.get("timestamp"),
        )
        for mood in moods
    ]


@router.get("/stats")
async def get_mood_stats(
    period: str = Query("7d", pattern="^(7d|30d|90d|all)$"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get mood statistics for the current user"""
    stats = await mood_service.get_mood_statistics(current_user.id, period)
    return stats


@router.get("/{mood_id}", response_model=MoodResponse)
async def get_mood(
    mood_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific mood entry"""
    mood = await mood_service.get_mood_by_id(mood_id, current_user.id)
    
    if not mood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )
    
    return MoodResponse(
        id=mood["_id"],
        user_id=mood["user_id"],
        mood=mood["mood"],
        intensity=mood.get("intensity", 3),
        notes=mood.get("notes"),
        timestamp=mood.get("timestamp") or mood.get("created_at"),
        created_at=mood.get("created_at") or mood.get("timestamp"),
    )


@router.put("/{mood_id}", response_model=MoodResponse)
async def update_mood(
    mood_id: str,
    mood_data: MoodUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a mood entry"""
    # Mood validation is handled by MoodUpdate.validate_mood() field validator
    mood = await mood_service.update_mood(mood_id, current_user.id, mood_data)
    
    if not mood:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )
    
    return MoodResponse(
        id=mood["_id"],
        user_id=mood["user_id"],
        mood=mood["mood"],
        intensity=mood.get("intensity", 3),
        notes=mood.get("notes"),
        timestamp=mood.get("timestamp") or mood.get("created_at"),
        created_at=mood.get("created_at") or mood.get("timestamp"),
    )


@router.delete("/{mood_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mood(
    mood_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    """Delete a mood entry"""
    success = await mood_service.delete_mood(mood_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mood entry not found"
        )
    
    return None
