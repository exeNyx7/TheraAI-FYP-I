"""
ModelService — Ollama + Llama 3.1 8B Local LLM Integration
Single entry point for ALL LLM chat calls in TheraAI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUDIT — WHY BLENDERBOT WAS REPLACED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files that referenced BlenderBot:
  • backend/app/services/ai_service.py
      - Lines 1-8   : docstring mentions BlenderBot
      - Lines 14-15 : HF_HUB timeouts set for large model download
      - Line  18    : AutoTokenizer, AutoModelForSeq2SeqLM imports
      - Lines 40-41 : _chatbot_tokenizer, _chatbot_model class fields
      - Lines 169-234: _initialize_model() — loads facebook/blenderbot-400M-distill
      - Lines 311-340: _format_conversation_history() — BlenderBot-specific </s><s> format
      - Lines 342-493: generate_response_llm() — the broken inference method
  • backend/app/api/chat.py
      - Lines 1-3   : docstring "AI-powered ... with BlenderBot"
      - Lines 89-101: calls ai_service.generate_response_llm()

Root causes of incoherent responses:
  1. HARDWARE: RTX 5060 uses CUDA compute capability sm_120, which PyTorch
     (as of 2025) does not support. BlenderBot ran entirely on CPU,
     making inference take 10-30 seconds per message.
  2. MODEL MISMATCH: BlenderBot-400M-distill is a social chitchat model
     trained on Reddit/Pushshift data. It was never designed for mental
     health support. It regularly "hallucinated" personal experiences
     ("my dog", "I went to the gym", "my family") which are nonsensical
     for an AI wellness companion.
  3. BROKEN FILTER: To patch problem #2, ai_service.py had a 40-line
     personal-claim filter (lines 434-477). This filter triggered so often
     that nearly every response was replaced with a hardcoded string —
     making the 1.6 GB BlenderBot model completely useless.

REPLACEMENT: Ollama + Llama 3.1 8B
  - Runs locally via the Ollama daemon (default: http://localhost:11434)
  - Llama 3.1 8B correctly follows system prompts and role-play personas
  - Native async via httpx — no GPU memory competition with DistilBERT/RoBERTa
  - Proper chat format: system / user / assistant message roles
  - No "personal claim" issues — Llama respects the system prompt identity

Setup instructions:
  1. Install Ollama: https://ollama.ai/download
  2. Start the daemon: ollama serve
  3. Pull the model:  ollama pull llama3.1:8b
  4. Verify:          curl http://localhost:11434/api/tags
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import logging
from typing import Optional, List, Dict, Any

import httpx

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.1:8b"
MAX_HISTORY_MESSAGES = 10   # How many prior conversation turns to include
RESPONSE_TIMEOUT_SECONDS = 60.0
MAX_TOKENS = 300             # Keep responses concise for therapy context


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

    Replaces: AIService.generate_response_llm() — BlenderBot (DEPRECATED)
    Backend:  Ollama local inference with Llama 3.1 8B

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
        Generate a therapeutic response using Llama 3.1 8B via Ollama.

        Args:
            user_message: The user's current message text.
            conversation_history: Optional list of prior messages.
                Accepts two formats:
                  - New format:    [{"role": "user"|"assistant", "content": "..."}]
                  - Legacy format: [{"role": "user"|"bot",       "message": "..."}]
                  The legacy format comes from the existing chat_history MongoDB records.
            user_context: Optional string with memory facts + demographics injected
                          into the system prompt to personalize responses.
            max_tokens: Override default MAX_TOKENS (used by memory extraction).

        Returns:
            str: AI-generated response. Falls back to generate_fallback_response()
                 if Ollama is unavailable — ensuring the endpoint never returns a 500.
        """
        if not user_message or not user_message.strip():
            raise ValueError("User message cannot be empty")

        try:
            # Build system prompt — inject user context if provided
            system_content = THERAPIST_SYSTEM_PROMPT
            if user_context and user_context.strip():
                system_content = (
                    THERAPIST_SYSTEM_PROMPT
                    + "\n\n## What you know about this user:\n"
                    + user_context.strip()
                )

            # Build the messages array: system + history + current user message
            messages: List[Dict[str, str]] = [
                {"role": "system", "content": system_content}
            ]

            # Normalize and append conversation history
            if conversation_history:
                recent = conversation_history[-MAX_HISTORY_MESSAGES:]
                for msg in recent:
                    role = msg.get("role", "user")
                    # Normalize legacy BlenderBot format ("bot" → "assistant")
                    if role == "bot":
                        role = "assistant"
                    # Normalize field name ("message" → "content")
                    content = msg.get("content") or msg.get("message", "")
                    if content and role in ("user", "assistant"):
                        messages.append({"role": role, "content": content.strip()})

            # Append current message
            messages.append({"role": "user", "content": user_message.strip()})

            # POST to Ollama /api/chat
            async with httpx.AsyncClient(timeout=RESPONSE_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "num_ctx": 2048,          # Limit context window to prevent VRAM overflow on RTX 3070
                            "temperature": 0.7,       # Balanced: warm but grounded
                            "top_p": 0.9,
                            "top_k": 40,
                            "num_predict": max_tokens if max_tokens else MAX_TOKENS,
                            "repeat_penalty": 1.1,    # Avoid repetitive phrasing
                            "stop": ["<|eot_id|>", "<|end_of_text|>"]
                        }
                    }
                )
                response.raise_for_status()

            data = response.json()
            ai_text = data.get("message", {}).get("content", "").strip()

            if not ai_text:
                logger.warning("ModelService: Empty response from Ollama, using fallback")
                return ModelService.generate_fallback_response(user_message)

            logger.info(f"ModelService: Response generated ({len(ai_text)} chars) via Ollama")
            return ai_text

        except httpx.ConnectError:
            logger.error(
                "ModelService: Cannot connect to Ollama at %s. "
                "Is Ollama running? Run: ollama serve", OLLAMA_BASE_URL
            )
            return ModelService.generate_fallback_response(user_message)

        except httpx.TimeoutException:
            logger.error(
                "ModelService: Request to Ollama timed out after %ss. "
                "Model may still be loading.", RESPONSE_TIMEOUT_SECONDS
            )
            return ModelService.generate_fallback_response(user_message)

        except Exception as e:
            logger.error("ModelService: Unexpected error: %s", str(e), exc_info=True)
            return ModelService.generate_fallback_response(user_message)

    @staticmethod
    async def check_health() -> Dict[str, Any]:
        """
        Check whether Ollama is running and the configured model is available.

        Returns:
            dict with keys: status, ollama_running, model, model_available, message
            status values: "healthy" | "degraded" | "unavailable" | "error"
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                response.raise_for_status()
                data = response.json()

            available_models = [m["name"] for m in data.get("models", [])]
            # Partial match: "llama3.1:8b" matches "llama3.1:8b", "llama3.1:8b-instruct-q4", etc.
            model_available = any(OLLAMA_MODEL in m for m in available_models)

            return {
                "status": "healthy" if model_available else "degraded",
                "ollama_running": True,
                "model": OLLAMA_MODEL,
                "model_available": model_available,
                "available_models": available_models,
                "message": (
                    f"Ready — {OLLAMA_MODEL} loaded"
                    if model_available
                    else f"Ollama running but '{OLLAMA_MODEL}' not found. "
                         f"Run: ollama pull {OLLAMA_MODEL}"
                )
            }

        except httpx.ConnectError:
            return {
                "status": "unavailable",
                "ollama_running": False,
                "model": OLLAMA_MODEL,
                "model_available": False,
                "message": (
                    "Ollama is not running. "
                    "Install from https://ollama.ai then run: ollama serve"
                )
            }

        except Exception as e:
            return {
                "status": "error",
                "ollama_running": False,
                "model": OLLAMA_MODEL,
                "model_available": False,
                "message": str(e)
            }

    @staticmethod
    def generate_fallback_response(user_message: str) -> str:
        """
        Rule-based fallback when Ollama is unavailable.
        Uses keyword matching for the most common mental health topics.
        Always returns a meaningful, supportive response — never an error string.

        This preserves the spirit of api/chat.py's generate_wellness_response()
        but adds crisis detection and improved language.
        """
        lower = user_message.lower()

        # ── Crisis detection — ALWAYS checked first ────────────────────────
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

        # ── Topic-based responses ──────────────────────────────────────────
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

        # ── Default warm response ──────────────────────────────────────────
        return (
            "Thank you for reaching out — that takes courage, and I'm here with you. "
            "I'd love to understand more about what's on your mind. "
            "What would feel most helpful to talk about right now?"
        )


# ─────────────────────────────────────────────────────────────────────────────
# CONVENIENCE FUNCTION (for dependency injection consistency)
# ─────────────────────────────────────────────────────────────────────────────

def get_model_service() -> type[ModelService]:
    """Return the ModelService class. Stateless — no instantiation required."""
    return ModelService
