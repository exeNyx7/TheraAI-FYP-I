"""
WebSocket Chat API

Real-time bidirectional chat for the AI wellness companion.
Each conversation gets its own WebSocket connection.

Protocol:
  Client → Server: JSON { "message": "..." }
  Server → Client: JSON { "type": "user"|"assistant"|"typing"|"error", "content": "...", "sentiment": "...", "crisis_detected": bool, ... }
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set

import pytz
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from ..config import get_settings
from ..database import db_manager
from ..services.model_service import ModelService
from ..services.crisis_service import CrisisService
from ..services.memory_service import MemoryService
from ..services.ai_service import get_ai_service
from .chat import _is_clean_text  # shared garbled-text guard

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

settings = get_settings()

# Active connections keyed by user_id
_active: Dict[str, Set[WebSocket]] = {}


def _add(user_id: str, ws: WebSocket):
    _active.setdefault(user_id, set()).add(ws)


def _remove(user_id: str, ws: WebSocket):
    if user_id in _active:
        _active[user_id].discard(ws)


def _verify_token(token: str) -> str | None:
    """Return user_id (sub) from a valid JWT, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None


@router.websocket("/ws/chat")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time AI chat.

    Query param: ?token=<JWT>

    Messages in:  { "message": "text" }
    Messages out: { "type": "typing"|"assistant"|"error", "content": "...", "sentiment": "...",
                    "crisis_detected": bool, "crisis_severity": str, "show_book_therapist": bool }
    """
    user_id = _verify_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await websocket.accept()
    _add(user_id, websocket)
    logger.info("WS connected: user=%s", user_id)

    try:
        while True:
            raw = await websocket.receive_text()

            # Parse message
            try:
                data = json.loads(raw)
                user_message = str(data.get("message", "")).strip()
            except (json.JSONDecodeError, AttributeError):
                await websocket.send_json({"type": "error", "content": "Invalid message format."})
                continue

            if not user_message:
                continue

            # Send typing indicator
            await websocket.send_json({"type": "typing"})

            db = db_manager.get_database()

            # ── Crisis detection ─────────────────────────────────────────
            emotions = []
            try:
                loop = asyncio.get_running_loop()
                ai_service = get_ai_service()
                emotion_result = await loop.run_in_executor(
                    None,
                    lambda: ai_service.analyze_emotions(user_message),
                )
                if emotion_result and "emotions" in emotion_result:
                    emotions = emotion_result["emotions"]
            except Exception:
                pass

            crisis_info = CrisisService.detect_crisis(user_message, emotions)

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

            # ── Load conversation history ────────────────────────────────
            history_records = await db.chat_history.find(
                {"user_id": user_id}
            ).sort("created_at", -1).limit(10).to_list(length=10)
            history_records.reverse()

            conversation_history = []
            for rec in history_records:
                user_msg = rec.get("user_message", "")
                ai_msg = rec.get("ai_response", "")
                # Skip entries with garbled/binary AI responses (old BlenderBot output)
                if not _is_clean_text(ai_msg):
                    logger.warning("WS: Skipping corrupted history entry (likely old BlenderBot output)")
                    continue
                conversation_history.append({"role": "user", "content": user_msg})
                conversation_history.append({"role": "assistant", "content": ai_msg})

            # ── Build user context from memory ───────────────────────────
            user_context = None
            if memory.facts or memory.detected_patterns:
                parts = []
                if memory.facts:
                    parts.append("Known facts: " + "; ".join(memory.facts[:5]))
                if memory.detected_patterns:
                    parts.append("Patterns: " + "; ".join(memory.detected_patterns[:3]))
                user_context = " | ".join(parts)

            # ── Generate AI response ─────────────────────────────────────
            ai_response = await ModelService.generate_response(
                user_message=user_message,
                conversation_history=conversation_history or None,
                user_context=user_context or None,
            )

            # ── Sentiment analysis ───────────────────────────────────────
            sentiment = "neutral"
            try:
                loop = asyncio.get_running_loop()
                ai_service = get_ai_service()
                sentiment_result = await loop.run_in_executor(
                    None,
                    lambda: ai_service.analyze_sentiment(user_message),
                )
                sentiment = sentiment_result.get("label", "neutral").lower()
            except Exception:
                pass

            # ── Persist to DB ────────────────────────────────────────────
            pakistan_tz = pytz.timezone("Asia/Karachi")
            timestamp = datetime.now(pakistan_tz).isoformat()

            await db.chat_history.insert_one({
                "user_id": user_id,
                "user_message": user_message,
                "ai_response": ai_response,
                "sentiment": sentiment,
                "crisis_severity": crisis_info["severity"],
                "timestamp": timestamp,
                "created_at": datetime.now(timezone.utc),
            })

            # ── Update memory (fire-and-forget) ──────────────────────────
            new_history = conversation_history + [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": ai_response},
            ]
            asyncio.create_task(MemoryService.update_memory_from_conversation(user_id, new_history))
            asyncio.create_task(MemoryService.update_risk_level(user_id))

            # ── Send response ─────────────────────────────────────────────
            await websocket.send_json({
                "type": "assistant",
                "content": ai_response,
                "sentiment": sentiment,
                "timestamp": timestamp,
                "crisis_detected": crisis_info["is_crisis"],
                "crisis_severity": crisis_info["severity"],
                "show_book_therapist": crisis_info["show_book_therapist"],
            })

    except WebSocketDisconnect:
        logger.info("WS disconnected: user=%s", user_id)
    except Exception as e:
        logger.exception("WS error for user=%s: %s", user_id, e)
        try:
            await websocket.send_json({"type": "error", "content": "Something went wrong. Please try again."})
        except Exception:
            pass
    finally:
        _remove(user_id, websocket)
