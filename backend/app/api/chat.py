"""
Chat API
AI-powered wellness companion chat endpoints with BlenderBot
"""

from datetime import datetime, timezone
from typing import Optional
import pytz
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..database import db_manager
from ..services.ai_service import get_ai_service

router = APIRouter(prefix="/chat", tags=["AI Chat"])


from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    """Chat message request"""
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    """Chat response"""
    response: str
    timestamp: str
    sentiment: Optional[str] = None
    crisis_detected: bool = False


CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end it all", "self harm", "self-harm",
    "want to die", "hurt myself", "no reason to live",
]


def _detect_crisis(message: str) -> bool:
    try:
        m = (message or "").lower()
        return any(k in m for k in CRISIS_KEYWORDS)
    except Exception:
        return False


class ChatHistory(BaseModel):
    """Chat history item"""
    id: str
    user_message: str
    ai_response: str
    timestamp: str
    sentiment: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    """Chat history response"""
    messages: list[ChatHistory]
    total: int


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    chat_message: ChatMessage,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Send a message to the AI wellness companion (BlenderBot)
    
    Uses conversation history for contextual responses
    Returns AI-generated response with mental health support
    """
    try:
        user_message = chat_message.message.strip()
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        db = db_manager.get_database()
        
        # Get recent conversation history (last 10 messages)
        history_limit = 10
        history_records = await db.chat_history.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(history_limit).to_list(length=history_limit)
        
        # Reverse to get chronological order (oldest first)
        history_records.reverse()
        
        # Format history for AI service
        conversation_history = []
        for record in history_records:
            conversation_history.append({
                "role": "user",
                "message": record["user_message"]
            })
            conversation_history.append({
                "role": "bot",
                "message": record["ai_response"]
            })
        
        # Generate AI response using BlenderBot
        ai_service = get_ai_service()
        
        try:
            import asyncio
            loop = asyncio.get_running_loop()
            
            ai_response = await loop.run_in_executor(
                None,
                lambda: ai_service.generate_response_llm(
                    user_message=user_message,
                    conversation_history=conversation_history if conversation_history else None
                )
            )
            
            # Also get sentiment of user message
            try:
                sentiment_result = await loop.run_in_executor(
                    None, 
                    lambda: ai_service.analyze_sentiment(user_message)
                )
                sentiment = sentiment_result["label"].lower()
            except Exception:
                sentiment = "neutral"
                
        except Exception as e:
            # Fallback to rule-based if AI fails
            ai_response = generate_wellness_response(user_message)
            sentiment = "supportive"
        
        # Get current time in Pakistan timezone (UTC+5)
        pakistan_tz = pytz.timezone('Asia/Karachi')
        current_time_pakistan = datetime.now(pakistan_tz)
        
        # Save to database
        chat_record = {
            "user_id": current_user.id,
            "user_message": user_message,
            "ai_response": ai_response,
            "sentiment": sentiment,
            "timestamp": current_time_pakistan.isoformat(),
            "created_at": datetime.now(timezone.utc)  # Keep UTC for database indexing
        }
        
        await db.chat_history.insert_one(chat_record)

        # Crisis detection (Phase 8)
        crisis_detected = _detect_crisis(user_message)
        if crisis_detected:
            try:
                await db.escalations.insert_one({
                    "patient_id": str(current_user.id),
                    "severity": "critical",
                    "triggered_by": "chat_keyword",
                    "message": user_message[:500],
                    "status": "open",
                    "free_session_granted": False,
                    "acknowledged": False,
                    "created_at": datetime.now(timezone.utc),
                })
            except Exception:
                pass
            try:
                await db.notifications.insert_one({
                    "user_id": str(current_user.id),
                    "type": "crisis_detected",
                    "title": "We're here to help",
                    "body": "We noticed you may be going through a difficult time. Booking a session with a therapist is recommended.",
                    "read": False,
                    "created_at": datetime.now(timezone.utc),
                })
            except Exception:
                pass

        return ChatResponse(
            response=ai_response,
            timestamp=current_time_pakistan.isoformat(),
            sentiment=sentiment,
            crisis_detected=crisis_detected,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Get chat history for current user
    
    Returns recent chat messages
    """
    try:
        db = db_manager.get_database()
        
        # Get chat history
        history = await db.chat_history.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Convert to response format
        messages = [
            ChatHistory(
                id=str(msg["_id"]),
                user_message=msg["user_message"],
                ai_response=msg["ai_response"],
                timestamp=msg["timestamp"],
                sentiment=msg.get("sentiment", "supportive")
            )
            for msg in history
        ]
        
        return ChatHistoryResponse(
            messages=messages,
            total=len(messages)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")


@router.delete("/history")
async def clear_chat_history(current_user: UserOut = Depends(get_current_user)):
    """
    Clear all chat history for current user
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
        raise HTTPException(status_code=500, detail=f"Failed to clear chat history: {str(e)}")


def generate_wellness_response(user_message: str) -> str:
    """
    Generate AI wellness companion response
    
    This is a placeholder implementation. In production, integrate with:
    - OpenAI API
    - Google Gemini
    - Local LLM (e.g., Llama, Mistral)
    - Custom fine-tuned model
    """
    lower_message = user_message.lower()
    
    # Response templates based on keywords
    responses = {
        "anxiety": "I understand that you're feeling anxious. Let's try a quick grounding exercise: Take a deep breath and name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. This 5-4-3-2-1 technique can help bring you back to the present moment and reduce anxiety.\n\nWould you like me to guide you through some other calming techniques?",
        
        "stress": "Managing stress is so important for your wellbeing. Here are some evidence-based techniques that might help:\n\n1. 🫁 Practice deep breathing exercises (4-7-8 technique)\n2. ⏸️ Take short breaks throughout your day\n3. 💪 Try progressive muscle relaxation\n4. 🏃 Engage in physical activity\n5. 👥 Connect with supportive people\n\nWhich of these would you like to explore further?",
        
        "sad": "I'm sorry you're feeling this way. It's completely okay to feel sad sometimes, and I'm here to support you. Remember that these feelings are temporary, and reaching out like this is a sign of strength.\n\nHere are some gentle suggestions:\n- Journal about your feelings\n- Reach out to a trusted friend or family member\n- Do something small that usually brings you joy\n- Practice self-compassion\n\nIf these feelings persist or worsen, please consider speaking with a mental health professional. Would you like to talk more about what's bothering you?",
        
        "sleep": "Quality sleep is crucial for mental health. Here are evidence-based tips to improve your sleep:\n\n🌙 Maintain a consistent sleep schedule (same bedtime and wake time)\n📱 Avoid screens 1 hour before bed (blue light affects melatonin)\n🛏️ Create a relaxing bedtime routine (reading, stretching, meditation)\n☕ Limit caffeine after 2 PM\n🧘 Try meditation or gentle stretching before bed\n🌡️ Keep your bedroom cool (65-68°F is optimal)\n\nWhich area would you like to work on first?",
        
        "motivation": "I'm glad you reached out! Remember, you've overcome challenges before, and you can do it again. Here's what I suggest:\n\n✨ Start small - even tiny steps count and build momentum\n💪 Celebrate your progress, no matter how small it seems\n🎯 Set one achievable goal for today\n❤️ Be kind to yourself - you're doing your best\n📊 Track your wins to see your progress visually\n\nWhat's one small thing you can do today that would make you proud? Let's break it down together.",
        
        "mindfulness": "Great choice! Let's try a simple mindfulness exercise:\n\n🧘 Find a comfortable position, sitting or lying down\n👃 Focus on your breath - notice the air entering and leaving\n🌊 Notice thoughts without judgment - let them float by like clouds\n⏱️ Continue for 2-3 minutes (or longer if comfortable)\n✨ Gently return to the present moment\n\nMindfulness takes practice, so be patient with yourself. Would you like to try this now, or would you prefer a different exercise like body scan or loving-kindness meditation?",
        
        "gratitude": "Practicing gratitude is wonderful for mental health! Research shows it can improve mood, reduce stress, and increase overall well-being.\n\nLet's try a gratitude exercise:\n1. Name 3 things you're grateful for today (can be small things)\n2. Think about why each one matters to you\n3. Notice how focusing on these makes you feel\n\nSome people find it helpful to keep a daily gratitude journal. Would you like to start one in your journal entries?",
        
        "goal": "Setting goals is great for motivation and growth! Let's use the SMART framework:\n\n✅ Specific - What exactly do you want to achieve?\n📊 Measurable - How will you track progress?\n🎯 Achievable - Is it realistic with your resources?\n💡 Relevant - Does it align with your values?\n⏰ Time-bound - What's your deadline?\n\nWhat goal would you like to work on? I can help you break it down into manageable steps.",
        
        "lonely": "Feeling lonely can be really difficult, and I appreciate you sharing this with me. Remember that loneliness is a common human experience, and it doesn't mean something is wrong with you.\n\nHere are some suggestions:\n👥 Reach out to someone - even a brief text can help\n🌐 Join online communities with shared interests\n🚶 Try activities where you might meet others (classes, clubs)\n💚 Practice self-compassion - be your own friend\n📝 Journal about your feelings\n\nWould you like to explore any of these options together?",
        
        "angry": "It sounds like you're feeling angry. Anger is a valid emotion, and it's important to acknowledge it. Let's work through this together:\n\n1. 🫁 Take a few deep breaths to calm your nervous system\n2. 🏃 If possible, move your body (walk, exercise)\n3. 📝 Write down what you're feeling without filtering\n4. 🤔 Try to identify the root cause (hurt, frustration, fear?)\n5. 💭 Consider constructive ways to address the situation\n\nRemember, it's okay to feel angry, but we want to express it in healthy ways. Would you like to talk more about what's making you angry?"
    }
    
    # Check for keywords and return appropriate response
    for keyword, response in responses.items():
        if keyword in lower_message:
            return response
    
    # Default supportive response
    return ("Thank you for sharing that with me. I'm here to support you on your wellness journey. "
            "Could you tell me more about what you're experiencing or what you'd like help with? "
            "For example, I can help with:\n\n"
            "• Managing stress and anxiety\n"
            "• Improving sleep\n"
            "• Building motivation\n"
            "• Practicing mindfulness\n"
            "• Setting goals\n"
            "• Processing emotions\n\n"
            "What would be most helpful for you right now?")
