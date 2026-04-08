"""
Gamification API Routes for TheraAI.
Provides XP, level, streak, and achievement endpoints.
"""

from fastapi import APIRouter, Depends

from ..models.user import UserOut
from ..dependencies.auth import get_current_user
from ..services.gamification_service import (
    get_gamification_summary,
    get_achievement_catalog,
)

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/me", summary="Get my gamification summary")
async def my_gamification(current_user: UserOut = Depends(get_current_user)):
    """Return XP, level, streak, and next-level progress for the current user."""
    return await get_gamification_summary(str(current_user.id))


@router.get("/achievements", summary="Get achievement catalog with unlock status")
async def my_achievements(current_user: UserOut = Depends(get_current_user)):
    """Return the full achievement catalog with unlocked flags for the current user."""
    return await get_achievement_catalog(str(current_user.id))
