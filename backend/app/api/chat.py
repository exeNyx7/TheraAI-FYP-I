"""
Chat API
AI-powered wellness companion chat endpoints.

Model backend: Ollama + Llama 3.1 8B (via ModelService)
AI memory:     MemoryService — cross-session user memory injected into system prompt
Crisis:        CrisisService — keyword + emotion detection, records events
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import pytz
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..database import db_manager
from ..services.ai_service import get_ai_service
from ..services.model_service import ModelService
from ..services.memory_service import MemoryService
from ..services.crisis_service import CrisisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])


# =============================================================================
# REQUEST / RESPONSE SCHEMAS
# =============================================================================

class ChatMessage(BaseModel):
    """Inbound chat message from the user"""
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    """Chat response returned to the frontend"""
    response: str
    timestamp: str
    sentiment: Optional[str] = None
    # Crisis fields — frontend uses these to show Book Therapist button
    crisis_detected: bool = False
    crisis_severity: str = "none"
    show_book_therapist: bool = False


class ChatHistory(BaseModel):
    """Single item from chat history"""
    id: str
    user_message: str
    ai_response: str
    timestamp: str
    sentiment: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    """Paginated chat history response"""
    messages: list[ChatHistory]
    total: int


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    chat_message: ChatMessage,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Send a message to the AI wellness companion (Llama 3.1 8B via Ollama).

    - Fetches user demographics + AI memory and injects into system prompt
    - Runs crisis detection before generating AI response
    - Retrieves last 10 conversation turns for context
    - Calls ModelService.generate_response() with user context
    - Fires off memory update as background task (non-blocking)
    - Saves exchange + crisis flags to MongoDB
    - Returns AI response with Pakistan-timezone timestamp + crisis info
    """
    try:
        user_message = chat_message.message.strip()

        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        db = db_manager.get_database()
        user_id = str(current_user.id)

        # ── Fetch user document for demographics ─────────────────────────
        from bson import ObjectId
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})

        # ── Build AI memory context (non-blocking, defaults to empty) ─────
        user_context = ""
        try:
            user_context = await MemoryService.build_memory_prompt(user_id, user_doc)
        except Exception:
            logger.debug("Memory context unavailable, continuing without it")

        # ── Crisis detection (runs before AI response) ────────────────────
        # Also run emotion analysis to enrich crisis detection
        emotions = []
        try:
            ai_service = get_ai_service()
            loop = asyncio.get_running_loop()
            emotion_result = await loop.run_in_executor(
                None,
                lambda: ai_service.analyze_emotions(user_message)
            )
            if emotion_result and "emotions" in emotion_result:
                emotions = emotion_result["emotions"]
        except Exception:
            logger.debug("Emotion analysis unavailable for crisis detection")

        crisis_info = CrisisService.detect_crisis(user_message, emotions)

        # ── Record crisis event + check persistent risk ───────────────────
        if crisis_info["is_crisis"]:
            asyncio.create_task(
                CrisisService.record_crisis_event(
                    user_id=user_id,
                    message=user_message,
                    severity=crisis_info["severity"],
                    keywords_matched=crisis_info["keywords_matched"],
                    emotions_detected=crisis_info["emotions_detected"],
                )
            )

        # Also force show_book_therapist when memory risk is high
        memory = await MemoryService.get_memory(user_id)
        if memory.risk_level in ("high", "crisis"):
            crisis_info["show_book_therapist"] = True

        # ── Fetch recent conversation history ─────────────────────────────
        history_records = await db.chat_history.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(10).to_list(length=10)
        history_records.reverse()

        conversation_history = []
        for record in history_records:
            conversation_history.append({"role": "user", "content": record["user_message"]})
            conversation_history.append({"role": "assistant", "content": record["ai_response"]})

        # ── Generate AI response via Ollama / Llama 3.1 8B ───────────────
        ai_response = await ModelService.generate_response(
            user_message=user_message,
            conversation_history=conversation_history or None,
            user_context=user_context or None,
        )

        # ── Sentiment analysis (best-effort) ─────────────────────────────
        sentiment = "neutral"
        try:
            ai_service = get_ai_service()
            loop = asyncio.get_running_loop()
            sentiment_result = await loop.run_in_executor(
                None,
                lambda: ai_service.analyze_sentiment(user_message)
            )
            sentiment = sentiment_result.get("label", "neutral").lower()
        except Exception:
            logger.debug("Sentiment analysis unavailable, defaulting to 'neutral'")

        # ── Persist to database ───────────────────────────────────────────
        pakistan_tz = pytz.timezone("Asia/Karachi")
        current_time_pakistan = datetime.now(pakistan_tz)

        chat_record = {
            "user_id": user_id,
            "user_message": user_message,
            "ai_response": ai_response,
            "sentiment": sentiment,
            "crisis_severity": crisis_info["severity"],
            "timestamp": current_time_pakistan.isoformat(),
            "created_at": datetime.now(timezone.utc),
        }
        await db.chat_history.insert_one(chat_record)

        # ── Update AI memory (fire-and-forget — never blocks response) ────
        new_history = conversation_history + [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": ai_response},
        ]
        asyncio.create_task(
            MemoryService.update_memory_from_conversation(user_id, new_history)
        )

        # ── Update risk level (fire-and-forget) ───────────────────────────
        asyncio.create_task(MemoryService.update_risk_level(user_id))

        return ChatResponse(
            response=ai_response,
            timestamp=current_time_pakistan.isoformat(),
            sentiment=sentiment,
            crisis_detected=crisis_info["is_crisis"],
            crisis_severity=crisis_info["severity"],
            show_book_therapist=crisis_info["show_book_therapist"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to process chat message")
        raise HTTPException(
            status_code=500,
            detail="Failed to process message. Please try again."
        )


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user)
):
    """Get recent chat history (newest first)."""
    try:
        db = db_manager.get_database()
        history = await db.chat_history.find(
            {"user_id": str(current_user.id)}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)

        messages = [
            ChatHistory(
                id=str(msg["_id"]),
                user_message=msg["user_message"],
                ai_response=msg["ai_response"],
                timestamp=msg["timestamp"],
                sentiment=msg.get("sentiment", "neutral"),
            )
            for msg in history
        ]
        return ChatHistoryResponse(messages=messages, total=len(messages))

    except Exception:
        logger.exception("Failed to fetch chat history")
        raise HTTPException(status_code=500, detail="Failed to get chat history")


@router.delete("/history")
async def clear_chat_history(current_user: UserOut = Depends(get_current_user)):
    """Permanently delete all chat history for the authenticated user."""
    try:
        db = db_manager.get_database()
        result = await db.chat_history.delete_many({"user_id": str(current_user.id)})
        return {
            "status": "success",
            "message": f"Deleted {result.deleted_count} messages",
            "deleted_count": result.deleted_count,
        }
    except Exception:
        logger.exception("Failed to clear chat history")
        raise HTTPException(status_code=500, detail="Failed to clear chat history")
