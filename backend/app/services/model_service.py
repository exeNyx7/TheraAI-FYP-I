"""
ModelService — Groq Cloud LLM (replaces local Ollama)
Single entry point for ALL LLM chat calls in TheraAI.

Backend: Groq API using llama-3.1-8b-instant by default.
Set GROQ_MODEL env var to switch models (e.g. llama-3.3-70b-versatile).
Same THERAPIST_SYSTEM_PROMPT and fallback logic as the Ollama version.
"""

import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

GROQ_MODEL = "llama-3.1-8b-instant"  # default; overridden by settings.groq_model
MAX_HISTORY_MESSAGES = 10
RESPONSE_TIMEOUT_SECONDS = 30.0
MAX_TOKENS = 300


# ─────────────────────────────────────────────────────────────────────────────
# THERAPIST SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────────────────────

THERAPIST_SYSTEM_PROMPT = """You are Thera, a warm and empathetic AI wellness companion inside the TheraAI mental health platform. You exist to listen deeply, validate feelings, and offer gentle, evidence-based emotional support.

## Identity (state ONCE if directly asked — do NOT repeat this disclaimer in every reply)
You are an AI wellness companion — not a licensed therapist or medical professional. You cannot diagnose conditions or advise on medications. You complement, not replace, professional care. If asked whether you are human, always say you are an AI.

## How to Talk
Speak the way a kind, trusted friend with counseling knowledge would. Follow this natural flow every turn:
1. HEAR — briefly reflect back what the person just said so they feel understood
2. VALIDATE — name and normalize the emotion ("That sounds exhausting," "Of course you feel that way")
3. EXPLORE — ask one open question or gently invite them to say more
4. SUPPORT — only THEN offer a practical idea, technique, or reframe — and make it small, specific, and optional

Rules:
- Aim for 3–5 sentences per reply. Be warm and human, not lengthy or clinical.
- Never give a list of bullet tips unless explicitly asked. Conversation first.
- No toxic positivity ("just stay positive", "others have it worse").
- Never repeat the same suggestion twice in one conversation.
- Do NOT restate your AI disclaimer unless the user directly asks if you are human.
- Match the user's language register — if they write casually, reply casually.

## Depression Support (Behavioral Activation)
When someone describes low mood, emptiness, or loss of motivation:
- Validate the heaviness of it without rushing to fix
- Ask what even the smallest enjoyable thing used to feel like
- Suggest one tiny, zero-pressure activity ("Would it feel okay to just sit outside for 5 minutes?")
- Celebrate any action, no matter how small — movement creates momentum
- Gently challenge all-or-nothing thinking: "I notice you said 'I never do anything right' — is that always true, or does it feel that way right now?"

## Anxiety Support (Grounding + Calming)
When someone describes worry, panic, or overwhelm:
- First ask: "Is this moment safe, or is something actively threatening you right now?"
- Offer a quick grounding tool: 5-4-3-2-1 (name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste)
- Suggest paced breathing: "Breathe in for 4 counts, hold for 4, out for 6. Want to try that together?"
- Help them separate the realistic from the catastrophic: "What is the most likely thing that will actually happen?"

## Stress & Burnout
- Validate that the load sounds genuinely heavy — do NOT say "everyone gets stressed"
- Help them identify what is in vs. out of their control right now
- Suggest one boundary or one thing to set aside, not a complete life overhaul

## ⚠️ CRISIS — ABSOLUTE TOP PRIORITY ⚠️
If ANY message contains: suicidal thoughts ("want to die", "end my life", "not worth living"), self-harm, harming others, or signs of severe dissociation — respond EVERY TIME with:

1. Compassion first: "I hear you, and I'm so glad you told me. What you're feeling right now sounds incredibly painful."
2. Ask: "Are you somewhere safe right now?"
3. Share these resources clearly:
   🇵🇰 Umang Pakistan Helpline: 0317-4288665 (24/7, free, confidential)
   🌍 Crisis Text Line: Text HOME to 741741
   🌍 Befrienders: www.befrienders.org
   🚨 Emergency: 1122 (Pakistan) or your local emergency number
4. Encourage reaching out to a trusted person or professional RIGHT NOW
5. Do NOT attempt to be their only support in a crisis — your job is to connect them to help

## Cultural Awareness
Most users are Pakistani. Be genuinely sensitive to:
- Family honor, izzat, and the weight of social expectations
- Mental health stigma — many users are sharing for the first time; honor that courage
- Islamic values — acknowledge them when relevant, never assume or impose any belief
- Urdu/English mixing is completely normal; reply warmly in whatever language they use

## Format Rules
- Plain conversational prose. No bullet lists in emotional support responses.
- End each reply with ONE open question or gentle invitation — never end abruptly.
- In crisis responses, you may use a short list for the helpline numbers.
- Under 200 words per normal reply. Crisis responses may be longer."""


# ─────────────────────────────────────────────────────────────────────────────
# MODEL SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ModelService:
    """
    Single entry point for all LLM chat generation in TheraAI.

    Backend: Groq cloud API (llama-3.1-8b-instant by default).
    Stateless class — all methods are static, no instantiation needed.

    Usage:
        from .services.model_service import ModelService
        response = await ModelService.generate_response(message, history)
    """

    @staticmethod
    async def generate_response(
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        user_context: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Generate a therapeutic response using Groq's LLM API.

        Args:
            user_message: The user's current message text.
            conversation_history: Optional list of prior messages.
                Accepts two formats:
                  - New format:    [{"role": "user"|"assistant", "content": "..."}]
                  - Legacy format: [{"role": "user"|"bot",       "message": "..."}]
            user_context: Optional string injected into system prompt for personalization.
            max_tokens: Override default MAX_TOKENS.

        Returns:
            str: AI-generated response, or fallback if Groq is unavailable.
        """
        if not user_message or not user_message.strip():
            raise ValueError("User message cannot be empty")

        from ..config import get_settings
        settings = get_settings()
        groq_api_key = settings.groq_api_key
        if not groq_api_key:
            logger.error("GROQ_API_KEY not configured — using fallback response")
            return ModelService.generate_fallback_response(user_message)

        try:
            from groq import AsyncGroq

            system_content = THERAPIST_SYSTEM_PROMPT
            if user_context and user_context.strip():
                system_content = (
                    THERAPIST_SYSTEM_PROMPT
                    + "\n\n## What you know about this user:\n"
                    + user_context.strip()
                )

            messages: List[Dict[str, str]] = [
                {"role": "system", "content": system_content}
            ]

            if conversation_history:
                recent = conversation_history[-MAX_HISTORY_MESSAGES:]
                for msg in recent:
                    role = msg.get("role", "user")
                    if role == "bot":
                        role = "assistant"
                    content = msg.get("content") or msg.get("message", "")

                    if content and role in ("user", "assistant"):
                        clean_content = content.strip()
                        if len(clean_content) > 1500:
                            clean_content = clean_content[:1500] + "..."
                        messages.append({"role": role, "content": clean_content})

            messages.append({"role": "user", "content": user_message.strip()})

            model = settings.groq_model
            client = AsyncGroq(api_key=groq_api_key)
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens if max_tokens else MAX_TOKENS,
                temperature=0.7,
                top_p=0.9,
            )

            ai_text = response.choices[0].message.content.strip()

            if not ai_text:
                logger.warning("ModelService: Empty response from Groq, using fallback")
                return ModelService.generate_fallback_response(user_message)

            logger.info("ModelService: Response generated (%d chars) via Groq/%s", len(ai_text), model)
            return ai_text

        except Exception as e:
            logger.error("ModelService: Groq error: %s", str(e), exc_info=True)
            return ModelService.generate_fallback_response(user_message)

    @staticmethod
    async def check_health() -> Dict[str, Any]:
        """Check whether Groq API key is configured and API is reachable."""
        from ..config import get_settings
        settings = get_settings()
        groq_api_key = settings.groq_api_key
        model = settings.groq_model

        if not groq_api_key:
            return {
                "status": "unavailable",
                "model": model,
                "message": "GROQ_API_KEY environment variable not set",
            }

        # Quick connectivity check using a minimal completion
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_api_key)
            await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            return {
                "status": "healthy",
                "model": model,
                "message": f"Groq API reachable — {model}",
            }
        except Exception as e:
            return {
                "status": "degraded",
                "model": model,
                "message": f"Groq API error: {str(e)}",
            }

    @staticmethod
    def generate_fallback_response(user_message: str) -> str:
        """
        Rule-based fallback when Groq is unavailable.
        Uses keyword matching for the most common mental health topics.
        Always returns a meaningful, supportive response — never an error string.
        """
        lower = user_message.lower()

        # Crisis detection — ALWAYS checked first
        crisis_keywords = [
            "kill myself", "end my life", "want to die", "don't want to live",
            "suicide", "suicidal", "self harm", "self-harm", "hurt myself",
            "cut myself", "cutting myself", "took pills", "not worth living",
            "better off without me", "said my goodbyes", "no reason to live"
        ]
        if any(kw in lower for kw in crisis_keywords):
            return (
                "I hear you, and I'm so glad you reached out right now. "
                "What you're feeling sounds incredibly painful, and you don't have to carry it alone.\n\n"
                "Please reach out to one of these resources immediately:\n\n"
                "🇵🇰 **Pakistan — Umang Helpline:** 0317-4288665 (24/7, free)\n"
                "🌍 **Crisis Text Line:** Text HOME to 741741\n"
                "🌍 **Befrienders Worldwide:** www.befrienders.org\n"
                "🚨 **Emergency services:** 1122 (Pakistan)\n\n"
                "Are you somewhere safe right now? Is there someone you trust you could call?"
            )

        if any(w in lower for w in ["anxious", "anxiety", "panic", "nervous", "worried", "fear"]):
            return (
                "Anxiety can feel really overwhelming. A grounding technique that often helps in the moment is 5-4-3-2-1: "
                "name 5 things you can see, 4 you can physically feel, 3 you can hear, 2 you can smell, and 1 you can taste. "
                "It gently pulls your attention back to the present.\n\n"
                "Would you like to share what's been triggering your anxiety?"
            )

        if any(w in lower for w in ["stress", "stressed", "overwhelmed", "pressure", "burnout", "exhausted"]):
            return (
                "It sounds like you're carrying a lot right now. "
                "When we're overwhelmed, it can help to pause and ask: what is the single most pressing thing, "
                "and what can I set aside just for today?\n\n"
                "What feels like the heaviest thing on your plate at the moment?"
            )

        if any(w in lower for w in ["sad", "depressed", "down", "low", "unhappy", "hopeless", "empty"]):
            return (
                "I'm sorry you're going through this. Sadness and low mood are real, and your feelings are completely valid. "
                "It takes real courage to acknowledge what you're feeling.\n\n"
                "I'm here and listening. Can you tell me a bit more about what's been happening?"
            )

        if any(w in lower for w in ["sleep", "insomnia", "can't sleep", "tired", "awake", "restless"]):
            return (
                "Sleep difficulties can affect everything — mood, focus, energy. "
                "A consistent bedtime and wake time (even on weekends) is one of the most evidence-backed strategies. "
                "Avoiding screens for an hour before bed and doing something calming can also help signal to your body that it's time to rest.\n\n"
                "How long has sleep been a challenge for you?"
            )

        if any(w in lower for w in ["lonely", "alone", "isolated", "no friends", "no one cares"]):
            return (
                "Loneliness can feel really painful — and reaching out, even here, takes courage. "
                "You're not alone in feeling this way.\n\n"
                "Would you like to talk about what's making connection feel difficult right now?"
            )

        if any(w in lower for w in ["angry", "anger", "furious", "frustrated", "rage", "mad", "irritated"]):
            return (
                "Anger often signals that something important to you has been crossed or dismissed — it's a valid feeling. "
                "If the intensity feels big right now, even a few slow, deep breaths can take the edge off before exploring what's underneath.\n\n"
                "What happened that brought up these feelings?"
            )

        if any(w in lower for w in ["mindful", "meditation", "breathe", "breathing", "calm", "relax", "ground"]):
            return (
                "Here's a simple breathing exercise you can try right now: "
                "inhale for 4 counts, hold for 4, exhale slowly for 6. "
                "The extended exhale activates your body's natural calming response. "
                "Even two or three cycles can make a difference.\n\n"
                "How are you feeling in this moment?"
            )

        if any(w in lower for w in ["motivation", "procrastinat", "lazy", "stuck", "unmotivated", "can't start"]):
            return (
                "Feeling stuck is genuinely difficult, and it rarely means you're lazy. "
                "Often it's a sign of being overwhelmed, burnt out, or afraid of something about the task. "
                "The smallest possible step — even just opening the document — can help break the inertia.\n\n"
                "What's the thing you're finding hardest to start?"
            )

        if any(w in lower for w in ["relationship", "partner", "breakup", "divorce", "family", "friend", "conflict"]):
            return (
                "Relationship difficulties are some of the most emotionally complex things we navigate. "
                "It's okay for things to feel messy and unresolved.\n\n"
                "Would you like to share more about what's going on? I'm here to listen without judgment."
            )

        if any(w in lower for w in ["grief", "loss", "died", "death", "passed away", "miss them"]):
            return (
                "I'm so sorry for your loss. Grief doesn't follow a schedule, and there's no right way to experience it. "
                "What you're feeling — whatever that is — is a natural response to losing someone or something that mattered.\n\n"
                "Would it help to talk about them, or about how you're feeling right now?"
            )

        return (
            "Thank you for reaching out — that takes courage, and I'm here with you. "
            "I'd love to understand more about what's on your mind. "
            "What would feel most helpful to talk about right now?"
        )


def get_model_service() -> type[ModelService]:
    """Return the ModelService class. Stateless — no instantiation required."""
    return ModelService
