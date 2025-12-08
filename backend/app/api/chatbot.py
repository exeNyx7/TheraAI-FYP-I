from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
from ..database import get_database
from ..services.chatbot_Service import get_ai_service, AIService
from ..dependencies.auth import get_current_user
import asyncio
# import axios
from fastapi.concurrency import run_in_threadpool


router = APIRouter(prefix="/chat", tags=["Chatbot"])

class ChatRequest(BaseModel):
    chat_id: str | None = None
    message: str


# Create new chat
@router.post("/new")
async def create_chat(user=Depends(get_current_user)):
    db = await get_database()
    chat = {
        "user_id": str(user.id),
        "title": "New Chat",
        "messages": [],
        "created_at": datetime.utcnow()
    }
    result = await db.chats.insert_one(chat)
    return {"chat_id": str(result.inserted_id)}


# List chats (sidebar)
@router.get("/list")
async def list_chats(user=Depends(get_current_user)):
    db = await get_database()
    cursor = db.chats.find({"user_id": str(user.id)}).sort("created_at", -1)


    chats = []
    async for chat in cursor:
        chats.append({"id": str(chat["_id"]), "title": chat["title"]})

    return {"chats": chats}


# Get single chat
@router.get("/{chat_id}")
async def get_chat(chat_id: str, user=Depends(get_current_user)):
    db = await get_database()

    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "user_id": str(user.id)
    })

    if not chat:
        raise HTTPException(404, "Chat not found")

    return {
        "chat_id": chat_id,
        "title": chat["title"],
        "messages": chat["messages"]
    }


# Send message + AI Response
@router.post("/message")
async def send_message(request: ChatRequest, ai_service: AIService = Depends(get_ai_service)):

    db = await get_database()

    chat_id = request.chat_id
    user_message = request.message

    # Sentiment
    sentiment = ai_service.analyze_text(user_message)

    # AI Reply
    reply = ai_service.generate_response(user_message)

    # Save bot reply
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$push": {
            "messages": {
                "sender": "bot",
                "text": reply,
                "sentiment": sentiment,
                "timestamp": datetime.utcnow()
            }
        }}
    )

    return {"reply": reply, "score": sentiment}