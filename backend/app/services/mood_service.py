"""
Mood Service - Business logic for mood tracking
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from ..database import get_database
from ..models.mood import MoodCreate, MoodUpdate


class MoodService:
    """Service for managing mood entries"""
    
    @staticmethod
    async def create_mood(user_id: str, mood_data: MoodCreate) -> Dict:
        """Create a new mood entry"""
        db = await get_database()
        
        mood_dict = {
            "user_id": user_id,
            "mood": mood_data.mood,
            "intensity": mood_data.intensity if mood_data.intensity is not None else 3,
            "notes": mood_data.notes or "",
            "timestamp": mood_data.timestamp or datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        result = await db.moods.insert_one(mood_dict)
        mood_dict["_id"] = str(result.inserted_id)

        # Fire-and-forget gamification (non-blocking)
        import asyncio
        async def _award():
            try:
                from .gamification_service import award_xp, update_streak, check_achievements
                await update_streak(user_id)
                await award_xp(user_id, 10)
                await check_achievements(user_id)
            except Exception:
                pass
        asyncio.create_task(_award())

        return mood_dict
    
    @staticmethod
    async def get_mood_by_id(mood_id: str, user_id: str) -> Optional[Dict]:
        """Get a single mood entry by ID"""
        db = await get_database()
        
        try:
            mood = await db.moods.find_one({
                "_id": ObjectId(mood_id),
                "user_id": user_id
            })
            
            if mood:
                mood["_id"] = str(mood["_id"])
            
            return mood
        except Exception:
            return None
    
    @staticmethod
    async def get_user_moods(
        user_id: str,
        limit: int = 30,
        skip: int = 0
    ) -> List[Dict]:
        """Get mood history for a user"""
        db = await get_database()
        
        cursor = db.moods.find({"user_id": user_id})\
            .sort("timestamp", -1)\
            .skip(skip)\
            .limit(limit)
        
        moods = await cursor.to_list(length=limit)
        
        for mood in moods:
            mood["_id"] = str(mood["_id"])
        
        return moods
    
    @staticmethod
    async def update_mood(
        mood_id: str,
        user_id: str,
        mood_data: MoodUpdate
    ) -> Optional[Dict]:
        """Update a mood entry"""
        db = await get_database()
        
        try:
            update_data = {k: v for k, v in mood_data.model_dump(exclude_unset=True).items() if v is not None}
            
            if not update_data:
                return await MoodService.get_mood_by_id(mood_id, user_id)
            
            result = await db.moods.find_one_and_update(
                {"_id": ObjectId(mood_id), "user_id": user_id},
                {"$set": update_data},
                return_document=True
            )
            
            if result:
                result["_id"] = str(result["_id"])
            
            return result
        except Exception:
            return None
    
    @staticmethod
    async def delete_mood(mood_id: str, user_id: str) -> bool:
        """Delete a mood entry"""
        db = await get_database()
        
        try:
            result = await db.moods.delete_one({
                "_id": ObjectId(mood_id),
                "user_id": user_id
            })
            
            return result.deleted_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def get_mood_statistics(user_id: str, period: str = "7d") -> Dict:
        """Get mood statistics for charts"""
        db = await get_database()
        
        # Parse period
        days = 7
        if period.endswith('d'):
            days = int(period[:-1])
        
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get all moods in the period
        moods = await db.moods.find({
            "user_id": user_id,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", -1).to_list(length=1000)
        
        # Calculate statistics
        mood_counts = {}
        mood_percentages = {}
        total_moods = len(moods)
        
        for mood_entry in moods:
            mood = mood_entry.get("mood", "neutral")
            mood_counts[mood] = mood_counts.get(mood, 0) + 1
        
        if total_moods > 0:
            for mood, count in mood_counts.items():
                mood_percentages[mood] = round((count / total_moods) * 100, 1)
        
        # Most common mood
        most_common = max(mood_counts.items(), key=lambda x: x[1])[0] if mood_counts else None
        
        # Recent moods for history
        recent_moods = []
        for mood in moods[:10]:
            recent_moods.append({
                "id": str(mood["_id"]),
                "mood": mood.get("mood"),
                "notes": mood.get("notes", ""),
                "timestamp": mood.get("timestamp").isoformat() if mood.get("timestamp") else None
            })
        
        return {
            "total_entries": total_moods,
            "most_common_mood": most_common,
            "mood_counts": mood_counts,
            "mood_percentages": mood_percentages,
            "recent_moods": recent_moods,
            "period": period
        }


# Export singleton instance
mood_service = MoodService()
