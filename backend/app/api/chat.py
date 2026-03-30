"""
Chat API
AI-powered wellness companion chat endpoints.

Model backend: Ollama + Llama 3.1 8B (via ModelService)
Replaced: BlenderBot-400M-distill (DEPRECATED — see services/model_service.py for audit)
"""

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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Chat"])


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# (kept here since they are simple and chat-specific; TODO: move to models/chat.py)
# ─────────────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """Inbound chat message from the user"""
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    """Chat response returned to the frontend"""
    response: str
    timestamp: str
    sentiment: Optional[str] = None


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


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    chat_message: ChatMessage,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Send a message to the AI wellness companion (Llama 3.1 8B via Ollama).

    - Retrieves the last 10 conversation turns from chat_history for context
    - Calls ModelService.generate_response() with full history
    - Runs DistilBERT sentiment analysis on the user's message (non-blocking)
    - Saves the exchange to MongoDB chat_history
    - Returns the AI response with Pakistan-timezone timestamp
    """
    try:
        user_message = chat_message.message.strip()

        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        db = db_manager.get_database()

        # ── Fetch recent conversation history ────────────────────────────
        history_limit = 10
        history_records = await db.chat_history.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(history_limit).to_list(length=history_limit)

        # Reverse to chronological order (oldest first)
        history_records.reverse()

        # Build history in the format ModelService expects
        # (also compatible with the legacy "bot"/"message" keys)
        conversation_history = []
        for record in history_records:
            conversation_history.append({
                "role": "user",
                "content": record["user_message"]
            })
            conversation_history.append({
                "role": "assistant",
                "content": record["ai_response"]
            })

        # ── Generate AI response via Ollama / Llama 3.1 8B ───────────────
        # ModelService handles its own fallback — this call will never raise.
        ai_response = await ModelService.generate_response(
            user_message=user_message,
            conversation_history=conversation_history if conversation_history else None
        )

        # ── DEPRECATED (BlenderBot) ───────────────────────────────────────
        # ai_service = get_ai_service()
        # import asyncio
        # loop = asyncio.get_running_loop()
        # ai_response = await loop.run_in_executor(
        #     None,
        #     lambda: ai_service.generate_response_llm(
        #         user_message=user_message,
        #         conversation_history=conversation_history if conversation_history else None
        #     )
        # )
        # ─────────────────────────────────────────────────────────────────

        # ── Sentiment analysis on the user's message (best-effort) ───────
        sentiment = "neutral"
        try:
            import asyncio
            ai_service = get_ai_service()
            loop = asyncio.get_running_loop()
            sentiment_result = await loop.run_in_executor(
                None,
                lambda: ai_service.analyze_sentiment(user_message)
            )
            sentiment = sentiment_result["label"].lower()
        except Exception:
            # Non-critical — don't fail the whole request over sentiment
            logger.debug("Sentiment analysis unavailable, defaulting to 'neutral'")

        # ── Persist to database ───────────────────────────────────────────
        pakistan_tz = pytz.timezone("Asia/Karachi")
        current_time_pakistan = datetime.now(pakistan_tz)

        chat_record = {
            "user_id": current_user.id,
            "user_message": user_message,
            "ai_response": ai_response,
            "sentiment": sentiment,
            "timestamp": current_time_pakistan.isoformat(),
            "created_at": datetime.now(timezone.utc)   # UTC for DB indexing
        }

        await db.chat_history.insert_one(chat_record)

        return ChatResponse(
            response=ai_response,
            timestamp=current_time_pakistan.isoformat(),
            sentiment=sentiment
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
    """
    Get recent chat history for the authenticated user.

    Returns messages in reverse chronological order (newest first).
    """
    try:
        db = db_manager.get_database()

        history = await db.chat_history.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)

        messages = [
            ChatHistory(
                id=str(msg["_id"]),
                user_message=msg["user_message"],
                ai_response=msg["ai_response"],
                timestamp=msg["timestamp"],
                sentiment=msg.get("sentiment", "neutral")
            )
            for msg in history
        ]

        return ChatHistoryResponse(messages=messages, total=len(messages))

    except Exception as e:
        logger.exception("Failed to fetch chat history")
        raise HTTPException(status_code=500, detail="Failed to get chat history")


@router.delete("/history")
async def clear_chat_history(current_user: UserOut = Depends(get_current_user)):
    """
    Permanently delete all chat history for the authenticated user.
    """
    try:
        db = db_manager.get_database()
        result = await db.chat_history.delete_many({"user_id": current_user.id})

        return {
            "status": "success",
            "message": f"Deleted {result.deleted_count} messages",
            "deleted_count": result.deleted_count
        }

    except Exception as e:
        logger.exception("Failed to clear chat history")
        raise HTTPException(status_code=500, detail="Failed to clear chat history")


# ─────────────────────────────────────────────────────────────────────────────
# KEYWORD FALLBACK (preserved for emergencies — normally handled by ModelService)
# ─────────────────────────────────────────────────────────────────────────────

def generate_wellness_response(user_message: str) -> str:
    """
    Legacy keyword-based wellness response.

    NOTE: This is now superseded by ModelService.generate_fallback_response().
    Kept here only for reference. Do not call this directly — call
    ModelService.generate_fallback_response(user_message) instead.
    """
    # Delegate to the consolidated fallback in ModelService
    return ModelService.generate_fallback_response(user_message)
