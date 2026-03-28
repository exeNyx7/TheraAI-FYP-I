from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List

from app.models.mood import MoodCreate, MoodUpdate, MoodResponse
from app.models.user import UserOut
from app.dependencies.auth import get_current_user
from app.services.mood_service import mood_service

router = APIRouter(prefix="/moods", tags=["moods"])


@router.post("", response_model=MoodResponse, status_code=status.HTTP_201_CREATED)
async def create_mood(
    mood_data: MoodCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new mood entry"""
    # Validate mood value
    valid_moods = ['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'stressed', 'neutral']
    if mood_data.mood not in valid_moods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mood. Must be one of: {', '.join(valid_moods)}"
        )
    
    mood = await mood_service.create_mood(current_user.id, mood_data)
    
    return MoodResponse(
        id=mood["_id"],
        user_id=mood["user_id"],
        mood=mood["mood"],
        notes=mood.get("notes"),
        timestamp=mood["timestamp"],
        created_at=mood["created_at"]
    )


@router.get("", response_model=List[MoodResponse])
async def get_moods(
    limit: int = Query(30, ge=1, le=100),
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
            notes=mood.get("notes"),
            timestamp=mood["timestamp"],
            created_at=mood["created_at"]
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
        notes=mood.get("notes"),
        timestamp=mood["timestamp"],
        created_at=mood["created_at"]
    )


@router.put("/{mood_id}", response_model=MoodResponse)
async def update_mood(
    mood_id: str,
    mood_data: MoodUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a mood entry"""
    # Validate mood value if provided
    if mood_data.mood:
        valid_moods = ['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'stressed', 'neutral']
        if mood_data.mood not in valid_moods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mood. Must be one of: {', '.join(valid_moods)}"
            )
    
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
        notes=mood.get("notes"),
        timestamp=mood["timestamp"],
        created_at=mood["created_at"]
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
