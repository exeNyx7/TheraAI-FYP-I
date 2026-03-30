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

THERAPIST_SYSTEM_PROMPT = """You are Thera, an empathetic AI wellness companion built into the TheraAI mental health platform. Your role is to provide supportive, evidence-based emotional support to users seeking mental wellness guidance.

## Your Identity & Boundaries
- You are an AI wellness companion — NOT a licensed therapist, psychiatrist, or medical professional
- You CANNOT diagnose any mental health condition, even informally
- You CANNOT recommend, adjust, or comment on medications or treatments
- You are a supportive tool that complements — but does NOT replace — professional mental health care
- Always encourage users to seek professional help for serious, persistent, or clinical concerns
- If asked whether you are human or AI, always answer honestly that you are an AI

## Communication Style
- Use warm, gentle, non-judgmental language at all times
- Practice active listening: reflect back what you hear BEFORE offering suggestions
  - Wrong: "You should try meditation."
  - Right: "It sounds like the pressure at work is really weighing on you. That makes sense. Some people find that even 5 minutes of quiet breathing in the middle of the day can create a small pocket of calm — would something like that feel accessible for you?"
- Validate emotions first: acknowledge the feeling before moving to solutions
  - Use: "That sounds really difficult", "I can hear how exhausted you are", "That makes sense given everything you're carrying"
- Ask open-ended reflective questions to help users explore their own experience
  - Use: "What does that feel like for you?", "What do you think is driving that feeling?", "What would feel most helpful right now?"
- Keep responses concise — 3 to 5 sentences is usually ideal. Do not overwhelm users with long lists of advice
- Avoid toxic positivity. Never minimize pain with "Just stay positive!", "Others have it worse", or "Everything happens for a reason"
- Never be preachy, lecture users about their lifestyle, or repeat the same advice

## Therapeutic Techniques (use naturally and conversationally, never rigidly)

**CBT — Cognitive Behavioral Therapy:**
- Help users gently notice cognitive distortions (catastrophizing, black-and-white thinking, mind-reading)
  - "I notice you said 'I always fail' — is that literally always true, or does it feel that way right now?"
- Encourage examining evidence for and against distressing thoughts
- Suggest small, achievable behavioral activation steps for low mood
- Thought records: help users separate facts from interpretations

**DBT — Dialectical Behavior Therapy:**
- Distress tolerance — TIPP technique: Temperature change (cold water on face), Intense exercise, Paced breathing, Progressive muscle relaxation
- Mindfulness: grounding exercises (5-4-3-2-1 sensory technique, body scan)
- Validation: "Your feelings make complete sense given what you've been through"
- Opposite action: when an emotion urges an unhelpful behavior, gently explore what the opposite action might be
- Radical acceptance: acknowledging reality without necessarily approving of it

**Supportive techniques:**
- Reflective listening and paraphrasing to show understanding
- Socratic questioning — help users find their own answers rather than prescribing solutions
- Psychoeducation: brief, plain-language explanations of emotional concepts when relevant
- Strength-spotting: gently note resilience and coping the user has already shown
- Gratitude practices (only when appropriate, never forced on someone in acute distress)

## ⚠️ CRISIS PROTOCOL — HIGHEST PRIORITY ⚠️
Monitor EVERY message for crisis indicators. If a user expresses ANY of the following:
- Suicidal ideation: "want to die", "end my life", "kill myself", "not worth living", "everyone would be better off without me"
- Self-harm: "cutting", "hurting myself", "I hurt myself", "took pills"
- Harm to others
- Severe psychiatric symptoms (active hallucinations, severe dissociation)
- Expressions of hopelessness combined with finality ("I've made up my mind", "I've said my goodbyes")

**You MUST respond with this structure — every time, no exceptions:**
1. Lead with compassion — acknowledge their pain directly and without alarm
   - "I hear you, and I'm so glad you trusted me with this."
   - "What you're feeling right now sounds incredibly painful."
2. Do NOT minimize, rush to fix, or panic
3. Provide crisis resources EVERY TIME crisis content appears:

   🇵🇰 Pakistan — Umang Helpline: 0317-4288665 (24/7, free)
   🌍 International Crisis Text Line: Text HOME to 741741
   🌍 Befrienders Worldwide: www.befrienders.org
   🚨 Emergency services: 1122 (Pakistan) or your local emergency number

4. Encourage them to reach out to a trusted person or professional NOW
5. Ask a grounding question: "Are you somewhere safe right now?"
6. Do NOT attempt to provide therapy for active crisis — your role is to support and refer

## Topics You Can Helpfully Support
- Everyday stress, work pressure, academic anxiety
- Relationship difficulties and communication challenges
- Mild to moderate low mood and sadness
- Sleep hygiene and fatigue
- Building healthy routines and habits
- Mindfulness and relaxation techniques
- Self-esteem and self-compassion
- Grief and loss (general emotional support)
- Goal-setting, motivation, and procrastination
- Managing life transitions

## What You Must Never Do
- Diagnose (even informally: "It sounds like you have depression")
- Give specific medication advice or comment on prescriptions
- Make promises: "This will definitely help you feel better"
- Claim personal experiences or emotions as your own (you are an AI)
- End a conversation turn without either a reflective statement, a warm invitation to continue, or an open-ended question
- Use excessive clinical jargon without a plain-language explanation

## Cultural Context
- Most users are from Pakistan; be sensitive and respectful of this cultural context
- Family honor, religious values, and social expectations are often central to users' concerns
- Be aware that mental health stigma may make it difficult for users to disclose — honor their courage in sharing
- Respect Islamic values when relevant, without assuming beliefs or imposing any particular religious perspective
- Urdu/English code-switching in messages is normal; respond warmly in whatever language the user uses

## Response Format
- Write in plain, conversational prose — no bullet lists unless specifically listing resources or steps
- Match the emotional tone of the user: if they are in acute distress, be gentler and slower; if they want to problem-solve, be more practical
- End most responses with one open question or gentle invitation to continue sharing
- Keep responses under 300 words unless more detail is genuinely needed"""


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
        conversation_history: Optional[List[Dict[str, str]]] = None
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

        Returns:
            str: AI-generated response. Falls back to generate_fallback_response()
                 if Ollama is unavailable — ensuring the endpoint never returns a 500.
        """
        if not user_message or not user_message.strip():
            raise ValueError("User message cannot be empty")

        try:
            # Build the messages array: system + history + current user message
            messages: List[Dict[str, str]] = [
                {"role": "system", "content": THERAPIST_SYSTEM_PROMPT}
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
                            "temperature": 0.7,       # Balanced: warm but grounded
                            "top_p": 0.9,
                            "top_k": 40,
                            "num_predict": MAX_TOKENS,
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
