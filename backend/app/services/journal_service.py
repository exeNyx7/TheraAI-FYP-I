"""
Journal Service Layer for TheraAI Mood Tracking System
Handles all journal-related business logic and database operations
"""

from typing import Optional, List
from datetime import datetime
from fastapi import HTTPException, status
from bson import ObjectId

from ..database import get_database
from ..models.journal import (
    JournalCreate,
    JournalOut,
    JournalInDB,
    JournalUpdate,
    MoodStatistics,
    MoodType,
    SentimentLabel
)
from .ai_service import get_ai_service


class JournalService:
    """Service class for journal operations"""
    
    @staticmethod
    async def create_entry(user_id: str, journal_data: JournalCreate) -> JournalOut:
        """
        Create a new journal entry with AI sentiment analysis
        
        Args:
            user_id: ID of the user creating the entry
            journal_data: Journal entry data from user
            
        Returns:
            JournalOut: Created journal entry with AI analysis
            
        Raises:
            HTTPException: If creation fails
        """
        try:
            db = await get_database()
            journals_collection = db.journals
            
            # Get AI analysis
            ai_service = get_ai_service()
            analysis = ai_service.analyze_text(journal_data.content)
            
            # Create journal document
            journal_doc = JournalInDB(
                user_id=user_id,
                content=journal_data.content,
                mood=journal_data.mood,
                title=journal_data.title,
                sentiment_label=analysis.label,
                sentiment_score=analysis.score,
                empathy_response=analysis.empathy_text,
                created_at=datetime.utcnow(),
                updated_at=None
            )
            
            # Insert into database
            result = await journals_collection.insert_one(
                journal_doc.dict(by_alias=True, exclude={"id"})
            )
            
            # Get the created document
            created_journal = await journals_collection.find_one({"_id": result.inserted_id})
            if not created_journal:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create journal entry"
                )
            
            return JournalOut.from_doc(created_journal)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create journal entry: {str(e)}"
            )
    
    @staticmethod
    async def get_user_entries(
        user_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[JournalOut]:
        """
        Get all journal entries for a user with pagination
        
        Args:
            user_id: ID of the user
            skip: Number of entries to skip (for pagination)
            limit: Maximum number of entries to return
            
        Returns:
            List[JournalOut]: List of journal entries
        """
        try:
            db = await get_database()
            journals_collection = db.journals
            
            # Query journals for user, sorted by creation date (newest first)
            cursor = journals_collection.find(
                {"user_id": user_id}
            ).sort("created_at", -1).skip(skip).limit(limit)
            
            # Convert to list of JournalOut
            journals = []
            async for doc in cursor:
                journals.append(JournalOut.from_doc(doc))
            
            return journals
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch journal entries: {str(e)}"
            )
    
    @staticmethod
    async def get_entry_by_id(entry_id: str, user_id: str) -> Optional[JournalOut]:
        """
        Get a single journal entry by ID
        Validates ownership (entry belongs to user)
        
        Args:
            entry_id: Journal entry ID
            user_id: ID of the user requesting the entry
            
        Returns:
            Optional[JournalOut]: Journal entry if found and owned by user
            
        Raises:
            HTTPException: If entry not found or not owned by user
        """
        # Validate ObjectId format
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid journal entry ID format"
            )
        
        try:
            db = await get_database()
            journals_collection = db.journals
            
            # Find entry
            entry_doc = await journals_collection.find_one({
                "_id": ObjectId(entry_id),
                "user_id": user_id  # Ensure ownership
            })
            
            if not entry_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Journal entry not found"
                )
            
            return JournalOut.from_doc(entry_doc)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch journal entry: {str(e)}"
            )
    
    @staticmethod
    async def update_entry(
        entry_id: str,
        user_id: str,
        update_data: JournalUpdate
    ) -> JournalOut:
        """
        Update an existing journal entry
        Re-runs AI analysis if content is updated
        
        Args:
            entry_id: Journal entry ID
            user_id: ID of the user updating the entry
            update_data: Updated journal data
            
        Returns:
            JournalOut: Updated journal entry
            
        Raises:
            HTTPException: If entry not found, not owned, or update fails
        """
        # Validate ObjectId format
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid journal entry ID format"
            )
        
        try:
            db = await get_database()
            journals_collection = db.journals
            
            # Check if entry exists and is owned by user
            existing_entry = await journals_collection.find_one({
                "_id": ObjectId(entry_id),
                "user_id": user_id
            })
            
            if not existing_entry:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Journal entry not found"
                )
            
            # Prepare update data
            update_dict = update_data.dict(exclude_unset=True)
            
            # If content is updated, re-run AI analysis
            if "content" in update_dict and update_dict["content"]:
                ai_service = get_ai_service()
                analysis = ai_service.analyze_text(update_dict["content"])
                update_dict["sentiment_label"] = analysis.label
                update_dict["sentiment_score"] = analysis.score
                update_dict["empathy_response"] = analysis.empathy_text
            
            # Add updated timestamp
            update_dict["updated_at"] = datetime.utcnow()
            
            # Update in database
            await journals_collection.update_one(
                {"_id": ObjectId(entry_id)},
                {"$set": update_dict}
            )
            
            # Get updated entry
            updated_entry = await journals_collection.find_one({"_id": ObjectId(entry_id)})
            return JournalOut.from_doc(updated_entry)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update journal entry: {str(e)}"
            )
    
    @staticmethod
    async def delete_entry(entry_id: str, user_id: str) -> bool:
        """
        Delete a journal entry
        
        Args:
            entry_id: Journal entry ID
            user_id: ID of the user deleting the entry
            
        Returns:
            bool: True if deleted successfully
            
        Raises:
            HTTPException: If entry not found or not owned by user
        """
        # Validate ObjectId format
        if not ObjectId.is_valid(entry_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid journal entry ID format"
            )
        
        try:
            db = await get_database()
            journals_collection = db.journals
            
            # Delete entry (only if owned by user)
            result = await journals_collection.delete_one({
                "_id": ObjectId(entry_id),
                "user_id": user_id
            })
            
            if result.deleted_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Journal entry not found"
                )
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete journal entry: {str(e)}"
            )
    
    @staticmethod
    async def get_mood_statistics(user_id: str) -> MoodStatistics:
        """
        Get mood and sentiment statistics for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            MoodStatistics: Aggregated statistics
        """
        try:
            db = await get_database()
            journals_collection = db.journals
            
            # Get all entries for user
            cursor = journals_collection.find({"user_id": user_id})
            entries = await cursor.to_list(length=None)
            
            total_entries = len(entries)
            
            if total_entries == 0:
                # Return empty statistics
                return MoodStatistics(
                    total_entries=0,
                    mood_counts={},
                    sentiment_distribution={},
                    average_sentiment_score=None,
                    most_common_mood=None,
                    recent_trend=None
                )
            
            # Count moods
            mood_counts = {}
            for mood in MoodType:
                count = sum(1 for e in entries if e.get("mood") == mood.value)
                if count > 0:
                    mood_counts[mood] = count
            
            # Count sentiments
            sentiment_distribution = {}
            for sentiment in SentimentLabel:
                count = sum(1 for e in entries if e.get("sentiment_label") == sentiment.value)
                if count > 0:
                    sentiment_distribution[sentiment] = count
            
            # Calculate average sentiment score
            sentiment_scores = [
                e.get("sentiment_score") 
                for e in entries 
                if e.get("sentiment_score") is not None
            ]
            average_sentiment_score = (
                sum(sentiment_scores) / len(sentiment_scores)
                if sentiment_scores else None
            )
            
            # Find most common mood
            most_common_mood = None
            if mood_counts:
                most_common_mood = max(mood_counts, key=mood_counts.get)
            
            # Calculate recent trend (last 5 entries vs previous 5)
            recent_trend = None
            if total_entries >= 5:
                sorted_entries = sorted(entries, key=lambda x: x.get("created_at", datetime.min), reverse=True)
                recent_avg = sum(
                    e.get("sentiment_score", 0.5) 
                    for e in sorted_entries[:5]
                ) / 5
                
                if total_entries >= 10:
                    previous_avg = sum(
                        e.get("sentiment_score", 0.5) 
                        for e in sorted_entries[5:10]
                    ) / 5
                    
                    if recent_avg > previous_avg + 0.1:
                        recent_trend = "improving"
                    elif recent_avg < previous_avg - 0.1:
                        recent_trend = "declining"
                    else:
                        recent_trend = "stable"
                else:
                    recent_trend = "insufficient_data"
            
            return MoodStatistics(
                total_entries=total_entries,
                mood_counts=mood_counts,
                sentiment_distribution=sentiment_distribution,
                average_sentiment_score=round(average_sentiment_score, 4) if average_sentiment_score else None,
                most_common_mood=most_common_mood,
                recent_trend=recent_trend
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to calculate mood statistics: {str(e)}"
            )
