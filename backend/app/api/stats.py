"""
User Statistics API
Endpoints for user stats, achievements, and activity feed
"""

from datetime import datetime, timedelta, timezone
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
            {"user_id": str(current_user.id)}
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
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
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
            member_since=current_user.created_at.isoformat() if hasattr(current_user, 'created_at') else datetime.now(timezone.utc).isoformat(),
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
            {"user_id": str(current_user.id)}
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
                unlocked=any(
                    e.get("created_at") and 5 <= parse_datetime(e["created_at"]).hour < 8
                    for e in entries
                ),
                progress=0,
                target=1
            ),
            Achievement(
                id="night_owl",
                name="Night Owl",
                description="Journal after 10 PM",
                icon="🌙",
                unlocked=any(
                    e.get("created_at") and (
                        parse_datetime(e["created_at"]).hour >= 22
                        or parse_datetime(e["created_at"]).hour < 2
                    )
                    for e in entries
                ),
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
        today = datetime.now(timezone.utc).date()
        
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
        return datetime.now(timezone.utc)

    try:
        # Handle ISO format with Z
        if "Z" in date_str:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        # Handle direct datetime objects
        if isinstance(date_str, datetime):
            return date_str
        return datetime.fromisoformat(date_str)
    except Exception:
        return datetime.now(timezone.utc)


# ── Weekly Mood Summary ──────────────────────────────────────────────────────

class DayMoodPoint(BaseModel):
    date: str          # YYYY-MM-DD
    avg_sentiment: float  # 0-10
    entry_count: int
    dominant_mood: Optional[str] = None


class WeeklyMoodSummary(BaseModel):
    days: list[DayMoodPoint]
    week_avg: float
    best_day: Optional[str] = None
    worst_day: Optional[str] = None
    total_entries: int
    trend: str  # "improving" | "declining" | "stable"
    ai_summary: str


@router.get("/me/weekly-summary", response_model=WeeklyMoodSummary)
async def get_weekly_mood_summary(current_user: UserOut = Depends(get_current_user)):
    """
    Get a 7-day mood trend summary with AI-generated insight.
    Uses journal sentiment scores + standalone mood entries.
    """
    try:
        db = db_manager.get_database()
        user_id = str(current_user.id)
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)

        # Fetch journal entries for last 7 days
        journal_entries = await db.journals.find(
            {"user_id": user_id, "created_at": {"$gte": week_ago}}
        ).to_list(length=None)

        # Fetch standalone mood entries for last 7 days
        mood_entries = await db.moods.find(
            {"user_id": user_id, "timestamp": {"$gte": week_ago}}
        ).to_list(length=None)

        # Build day-by-day buckets
        _MOOD_SCORES = {
            "happy": 9, "excited": 8, "calm": 7, "neutral": 5,
            "anxious": 4, "sad": 3, "stressed": 3, "angry": 2,
        }
        from collections import defaultdict
        buckets: dict[str, list[float]] = defaultdict(list)
        mood_bucket: dict[str, list[str]] = defaultdict(list)

        for entry in journal_entries:
            dt = parse_datetime(entry.get("created_at", ""))
            day = dt.strftime("%Y-%m-%d")
            score = entry.get("sentiment_score", 0.5)
            buckets[day].append(score * 10)
            if entry.get("mood"):
                mood_bucket[day].append(entry["mood"])

        for entry in mood_entries:
            dt = parse_datetime(entry.get("timestamp", entry.get("created_at", "")))
            day = dt.strftime("%Y-%m-%d")
            mood = entry.get("mood", "neutral")
            score = _MOOD_SCORES.get(mood, 5)
            buckets[day].append(float(score))
            mood_bucket[day].append(mood)

        # Generate points for all 7 days
        today = datetime.now(timezone.utc).date()
        days_out = []
        all_avgs = []
        for i in range(6, -1, -1):
            d = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            scores = buckets.get(d, [])
            avg = round(sum(scores) / len(scores), 1) if scores else 0.0
            moods = mood_bucket.get(d, [])
            dominant = max(set(moods), key=moods.count) if moods else None
            days_out.append(DayMoodPoint(
                date=d,
                avg_sentiment=avg,
                entry_count=len(scores),
                dominant_mood=dominant,
            ))
            if scores:
                all_avgs.append(avg)

        week_avg = round(sum(all_avgs) / len(all_avgs), 1) if all_avgs else 0.0

        # Best / worst days (only days with entries)
        filled = [p for p in days_out if p.entry_count > 0]
        best_day = max(filled, key=lambda p: p.avg_sentiment).date if filled else None
        worst_day = min(filled, key=lambda p: p.avg_sentiment).date if filled else None

        # Trend: compare first half vs second half
        first_half = [p.avg_sentiment for p in days_out[:3] if p.entry_count > 0]
        second_half = [p.avg_sentiment for p in days_out[4:] if p.entry_count > 0]
        if first_half and second_half:
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)
            if second_avg - first_avg > 0.5:
                trend = "improving"
            elif first_avg - second_avg > 0.5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        # AI summary
        total_entries = sum(p.entry_count for p in days_out)
        if total_entries == 0:
            ai_summary = "No entries this week. Start journaling to see your mood trends!"
        elif trend == "improving":
            ai_summary = f"Great week! Your mood improved over the past 7 days with an average score of {week_avg}/10. Keep up the positive habits."
        elif trend == "declining":
            ai_summary = f"Your mood dipped this week (avg {week_avg}/10). Consider talking to your AI companion or booking a session with a therapist."
        else:
            ai_summary = f"Your mood stayed steady this week with an average of {week_avg}/10. Consistency is a great foundation for mental wellness."

        return WeeklyMoodSummary(
            days=days_out,
            week_avg=week_avg,
            best_day=best_day,
            worst_day=worst_day,
            total_entries=total_entries,
            trend=trend,
            ai_summary=ai_summary,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate weekly summary: {str(e)}")
