"""
User Statistics API
Endpoints for user stats, achievements, and activity feed
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..database import db_manager

router = APIRouter(prefix="/users", tags=["User Statistics"])


class UserStats(BaseModel):
    """User statistics response model"""
    streak: int
    total_points: int
    level: int
    journal_entries: int
    mood_score: float
    weekly_goal: int
    weekly_progress: int
    member_since: str
    last_entry_date: Optional[str] = None


class Achievement(BaseModel):
    """Achievement model"""
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool
    date: Optional[str] = None
    progress: Optional[int] = None
    target: Optional[int] = None


class AchievementsResponse(BaseModel):
    """Achievements response"""
    achievements: list[Achievement]
    total: int
    unlocked: int


class Activity(BaseModel):
    """Activity feed item"""
    type: str
    message: str
    timestamp: str
    icon: Optional[str] = None


class ActivityFeedResponse(BaseModel):
    """Activity feed response"""
    activities: list[Activity]
    total: int


@router.get("/me/stats", response_model=UserStats)
async def get_user_stats(current_user: UserOut = Depends(get_current_user)):
    """
    Get comprehensive user statistics
    
    Returns:
    - Streak count (consecutive days with entries)
    - Total XP points
    - Current level
    - Journal entry count
    - Average mood score
    - Weekly goal and progress
    """
    try:
        db = db_manager.get_database()
        
        # Get journal entries
        entries = await db.journals.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).to_list(length=None)
        
        # Calculate statistics
        total_entries = len(entries)
        
        # Calculate streak
        streak = await calculate_streak(entries)
        
        # Calculate average mood (from sentiment scores)
        total_sentiment = sum(entry.get("sentiment_score", 0) for entry in entries)
        avg_mood = round((total_sentiment / total_entries * 10) if total_entries > 0 else 0, 1)
        
        # Calculate XP and level
        total_points = total_entries * 10  # 10 points per entry
        level = (total_points // 100) + 1  # Level up every 100 points
        
        # Weekly progress
        week_ago = datetime.utcnow() - timedelta(days=7)
        weekly_entries = 0
        for entry in entries:
            try:
                entry_date = parse_datetime(entry.get("created_at", ""))
                if entry_date > week_ago:
                    weekly_entries += 1
            except Exception:
                continue
        
        # Get last entry date
        last_entry_date = None
        if entries:
            try:
                last_entry_date = parse_datetime(entries[0].get("created_at", "")).isoformat()
            except Exception:
                pass
        
        return UserStats(
            streak=streak,
            total_points=total_points,
            level=level,
            journal_entries=total_entries,
            mood_score=avg_mood,
            weekly_goal=5,  # Default goal
            weekly_progress=weekly_entries,
            member_since=current_user.created_at.isoformat() if hasattr(current_user, 'created_at') else datetime.utcnow().isoformat(),
            last_entry_date=last_entry_date
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user stats: {str(e)}")


@router.get("/me/achievements", response_model=AchievementsResponse)
async def get_user_achievements(current_user: UserOut = Depends(get_current_user)):
    """
    Get user achievements
    
    Returns list of achievements with unlock status
    """
    try:
        db = db_manager.get_database()
        
        # Get journal entries for achievement calculation
        entries = await db.journals.find(
            {"user_id": current_user.id}
        ).to_list(length=None)
        
        total_entries = len(entries)
        
        # Define achievements
        achievements = [
            Achievement(
                id="first_entry",
                name="First Entry",
                description="Created your first journal entry",
                icon="✍️",
                unlocked=total_entries >= 1,
                date=entries[0]["created_at"] if total_entries >= 1 else None
            ),
            Achievement(
                id="week_streak",
                name="Week Warrior",
                description="Maintained a 7-day streak",
                icon="🔥",
                unlocked=await calculate_streak(entries) >= 7,
                progress=await calculate_streak(entries),
                target=7
            ),
            Achievement(
                id="ten_entries",
                name="Getting Started",
                description="Created 10 journal entries",
                icon="📝",
                unlocked=total_entries >= 10,
                progress=min(total_entries, 10),
                target=10
            ),
            Achievement(
                id="fifty_entries",
                name="Dedicated Writer",
                description="Created 50 journal entries",
                icon="📚",
                unlocked=total_entries >= 50,
                progress=min(total_entries, 50),
                target=50
            ),
            Achievement(
                id="hundred_entries",
                name="Master Journalist",
                description="Created 100 journal entries",
                icon="🏆",
                unlocked=total_entries >= 100,
                progress=min(total_entries, 100),
                target=100
            ),
            Achievement(
                id="mood_tracker",
                name="Mood Master",
                description="Track your mood for 30 days",
                icon="😊",
                unlocked=total_entries >= 30,
                progress=min(total_entries, 30),
                target=30
            ),
            Achievement(
                id="early_bird",
                name="Early Bird",
                description="Journal before 8 AM",
                icon="🌅",
                unlocked=False,  # Implement time-based check
                progress=0,
                target=1
            ),
            Achievement(
                id="night_owl",
                name="Night Owl",
                description="Journal after 10 PM",
                icon="🌙",
                unlocked=False,  # Implement time-based check
                progress=0,
                target=1
            ),
            Achievement(
                id="monthly_streak",
                name="Monthly Champion",
                description="Maintained a 30-day streak",
                icon="🎖️",
                unlocked=await calculate_streak(entries) >= 30,
                progress=await calculate_streak(entries),
                target=30
            ),
            Achievement(
                id="self_care",
                name="Self-Care Pro",
                description="Complete your first wellness activity",
                icon="💚",
                unlocked=False,
                progress=0,
                target=1
            ),
            Achievement(
                id="mindful",
                name="Mindfulness Master",
                description="Practice mindfulness 10 times",
                icon="🧘",
                unlocked=False,
                progress=0,
                target=10
            ),
            Achievement(
                id="supporter",
                name="Community Supporter",
                description="Support others in the community",
                icon="🤝",
                unlocked=False,
                progress=0,
                target=1
            )
        ]
        
        unlocked_count = sum(1 for ach in achievements if ach.unlocked)
        
        return AchievementsResponse(
            achievements=achievements,
            total=len(achievements),
            unlocked=unlocked_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get achievements: {str(e)}")


@router.get("/me/activity", response_model=ActivityFeedResponse)
async def get_activity_feed(
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Get user activity feed
    
    Returns recent activities (journal entries, mood changes, etc.)
    """
    try:
        db = db_manager.get_database()
        
        # Get recent journal entries
        entries = await db.journals.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Convert to activities
        activities = []
        for entry in entries:
            sentiment = entry.get("sentiment", "neutral")
            emoji_map = {
                "very_positive": "😊",
                "positive": "🙂",
                "neutral": "😐",
                "negative": "😔",
                "very_negative": "😢"
            }
            
            activities.append(
                Activity(
                    type="journal",
                    message=f"Created a new journal entry - {sentiment.replace('_', ' ').title()}",
                    timestamp=entry["created_at"],
                    icon=emoji_map.get(sentiment, "📝")
                )
            )
        
        return ActivityFeedResponse(
            activities=activities,
            total=len(activities)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get activity feed: {str(e)}")


async def calculate_streak(entries: list) -> int:
    """Calculate consecutive day streak from journal entries"""
    if not entries:
        return 0
    
    try:
        # Sort entries by date (newest first)
        sorted_entries = sorted(
            entries,
            key=lambda x: parse_datetime(x.get("created_at", "")),
            reverse=True
        )
        
        # Check if last entry was today or yesterday
        last_entry_date = parse_datetime(sorted_entries[0].get("created_at", "")).date()
        today = datetime.utcnow().date()
        
        if (today - last_entry_date).days > 1:
            return 0  # Streak broken
        
        # Count consecutive days
        streak = 1
        current_date = last_entry_date
        
        for entry in sorted_entries[1:]:
            entry_date = parse_datetime(entry.get("created_at", "")).date()
            
            expected_date = current_date - timedelta(days=1)
            
            if entry_date == expected_date:
                streak += 1
                current_date = entry_date
            elif entry_date == current_date:
                continue  # Same day, skip
            else:
                break  # Streak broken
        
        return streak
    except Exception as e:
        print(f"Error calculating streak: {str(e)}")
        return 0


def parse_datetime(date_str: str) -> datetime:
    """Safely parse datetime string"""
    if not date_str:
        return datetime.utcnow()
    
    try:
        # Handle ISO format with Z
        if "Z" in date_str:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        # Handle direct datetime objects
        if isinstance(date_str, datetime):
            return date_str
        return datetime.fromisoformat(date_str)
    except Exception:
        return datetime.utcnow()
