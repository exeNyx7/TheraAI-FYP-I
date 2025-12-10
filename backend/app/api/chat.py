"""
Chat API
AI-powered wellness companion chat endpoints
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..dependencies.auth import get_current_user
from ..models.user import UserOut
from ..database import db_manager

router = APIRouter(prefix="/chat", tags=["AI Chat"])


class ChatMessage(BaseModel):
    """Chat message request"""
    message: str


class ChatResponse(BaseModel):
    """Chat response"""
    response: str
    timestamp: str
    sentiment: Optional[str] = None


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
    Send a message to the AI wellness companion
    
    Returns AI-generated response with mental health support
    """
    try:
        user_message = chat_message.message.strip()
        
        if not user_message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Generate AI response (placeholder - integrate actual AI later)
        ai_response = generate_wellness_response(user_message)
        
        # Save to database
        db = db_manager.get_database()
        chat_record = {
            "user_id": current_user.id,
            "user_message": user_message,
            "ai_response": ai_response,
            "timestamp": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow()
        }
        
        await db.chat_history.insert_one(chat_record)
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.utcnow().isoformat(),
            sentiment="supportive"
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
