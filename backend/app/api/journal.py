"""
Journal API Routes for TheraAI Mood Tracking System
Handles journal entry creation, retrieval, updates, and statistics
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from ..models.journal import JournalCreate, JournalOut, JournalUpdate, MoodStatistics
from ..models.user import UserOut
from ..services.journal_service import JournalService
from ..dependencies.auth import get_current_user

router = APIRouter(prefix="/journals", tags=["Journals"])


@router.post(
    "",
    response_model=JournalOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new journal entry",
    description="Create a new journal entry with AI sentiment analysis and empathy response"
)
async def create_journal_entry(
    journal_data: JournalCreate,
    current_user: UserOut = Depends(get_current_user)
) -> JournalOut:
    """
    Create a new journal entry with AI analysis
    
    - **content**: Journal text content (10-5000 characters)
    - **mood**: User-selected mood (happy, sad, anxious, angry, calm, excited, stressed, neutral)
    - **title**: Optional title for the entry
    
    The AI will automatically:
    - Analyze the sentiment of your writing (positive/negative/neutral)
    - Generate an empathetic response based on your emotions
    - Store the analysis alongside your entry
    
    **Requires authentication**: User must be logged in
    
    **Returns**: Created journal entry with AI analysis results
    """
    try:
        entry = await JournalService.create_entry(
            user_id=str(current_user.id),
            journal_data=journal_data
        )
        return entry
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to create journal entry")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )


@router.get(
    "",
    response_model=List[JournalOut],
    summary="Get user's journal entries",
    description="Retrieve all journal entries for the authenticated user with pagination"
)
async def get_journal_entries(
    skip: int = Query(default=0, ge=0, description="Number of entries to skip"),
    limit: int = Query(default=50, ge=1, le=500, description="Maximum number of entries to return"),
    current_user: UserOut = Depends(get_current_user)
) -> List[JournalOut]:
    """
    Get all journal entries for the current user
    
    **Pagination parameters:**
    - **skip**: Number of entries to skip (default: 0)
    - **limit**: Maximum entries to return (default: 50, max: 100)
    
    Entries are returned in reverse chronological order (newest first)
    
    **Requires authentication**: User must be logged in
    
    **Returns**: List of journal entries with AI analysis
    """
    try:
        entries = await JournalService.get_user_entries(
            user_id=str(current_user.id),
            skip=skip,
            limit=limit
        )
        return entries
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to fetch journal entries")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )


@router.get(
    "/stats",
    response_model=MoodStatistics,
    summary="Get mood and sentiment statistics",
    description="Get aggregated statistics about user's mood patterns and sentiment trends"
)
async def get_mood_statistics(
    current_user: UserOut = Depends(get_current_user)
) -> MoodStatistics:
    """
    Get comprehensive mood and sentiment statistics
    
    **Statistics include:**
    - Total number of journal entries
    - Count of each mood type (happy, sad, anxious, etc.)
    - Sentiment distribution (positive, negative, neutral)
    - Average sentiment score across all entries
    - Most common mood
    - Recent trend analysis (improving/declining/stable)
    
    **Requires authentication**: User must be logged in
    
    **Returns**: Aggregated mood and sentiment statistics
    """
    try:
        stats = await JournalService.get_mood_statistics(
            user_id=str(current_user.id)
        )
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )


@router.get(
    "/{entry_id}",
    response_model=JournalOut,
    summary="Get a single journal entry",
    description="Retrieve a specific journal entry by ID"
)
async def get_journal_entry(
    entry_id: str,
    current_user: UserOut = Depends(get_current_user)
) -> JournalOut:
    """
    Get a specific journal entry by ID
    
    - **entry_id**: MongoDB ObjectId of the journal entry
    
    **Requires authentication**: User must be logged in and own the entry
    
    **Returns**: Journal entry with AI analysis
    
    **Raises**:
    - 400: Invalid entry ID format
    - 404: Entry not found or not owned by current user
    """
    try:
        entry = await JournalService.get_entry_by_id(
            entry_id=entry_id,
            user_id=str(current_user.id)
        )
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch journal entry: {str(e)}"
        )


@router.put(
    "/{entry_id}",
    response_model=JournalOut,
    summary="Update a journal entry",
    description="Update an existing journal entry (re-runs AI analysis if content changes)"
)
async def update_journal_entry(
    entry_id: str,
    update_data: JournalUpdate,
    current_user: UserOut = Depends(get_current_user)
) -> JournalOut:
    """
    Update an existing journal entry
    
    - **entry_id**: MongoDB ObjectId of the journal entry
    - **content**: Updated journal text (optional)
    - **mood**: Updated mood (optional)
    - **title**: Updated title (optional)
    
    **Note**: If content is updated, AI analysis will be re-run automatically
    
    **Requires authentication**: User must be logged in and own the entry
    
    **Returns**: Updated journal entry with fresh AI analysis (if content changed)
    
    **Raises**:
    - 400: Invalid entry ID format
    - 404: Entry not found or not owned by current user
    """
    try:
        entry = await JournalService.update_entry(
            entry_id=entry_id,
            user_id=str(current_user.id),
            update_data=update_data
        )
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update journal entry: {str(e)}"
        )


class JournalInsightResponse(BaseModel):
    ai_insight: str
    ai_suggestion: str


@router.post(
    "/{entry_id}/analyze",
    response_model=JournalInsightResponse,
    summary="Generate AI insight for a journal entry",
    description="Call Groq/Llama to generate an empathetic reflection and suggestion for the entry. Result is stored in the journal document.",
)
async def analyze_journal_entry(
    entry_id: str,
    current_user: UserOut = Depends(get_current_user),
) -> JournalInsightResponse:
    """
    Generate and store an AI-powered insight for the given journal entry.
    Safe to call multiple times — overwrites the previous insight.
    """
    from bson import ObjectId
    from datetime import datetime, timezone
    from ..database import get_database
    from ..services.model_service import ModelService

    if not ObjectId.is_valid(entry_id):
        raise HTTPException(status_code=400, detail="Invalid journal entry ID format")

    try:
        db = await get_database()
        entry_doc = await db.journals.find_one({
            "_id": ObjectId(entry_id),
            "user_id": str(current_user.id),
        })
        if not entry_doc:
            raise HTTPException(status_code=404, detail="Journal entry not found")

        content = entry_doc.get("content", "")
        result = await ModelService.analyze_text(content, task="journal_insight")

        ai_insight = result.get("insight", "")
        ai_suggestion = result.get("suggestion", "")

        await db.journals.update_one(
            {"_id": ObjectId(entry_id)},
            {"$set": {
                "ai_insight": ai_insight,
                "ai_suggestion": ai_suggestion,
                "updated_at": datetime.now(timezone.utc),
            }},
        )

        return JournalInsightResponse(ai_insight=ai_insight, ai_suggestion=ai_suggestion)

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("Failed to analyze journal entry")
        raise HTTPException(status_code=500, detail="Failed to generate AI insight. Please try again.")


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a journal entry",
    description="Permanently delete a journal entry"
)
async def delete_journal_entry(
    entry_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Delete a journal entry permanently
    
    - **entry_id**: MongoDB ObjectId of the journal entry
    
    **Warning**: This action cannot be undone
    
    **Requires authentication**: User must be logged in and own the entry
    
    **Returns**: 204 No Content on success
    
    **Raises**:
    - 400: Invalid entry ID format
    - 404: Entry not found or not owned by current user
    """
    try:
        await JournalService.delete_entry(
            entry_id=entry_id,
            user_id=str(current_user.id)
        )
        return None  # 204 No Content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete journal entry: {str(e)}"
        )
