"""
Memory Service — AI Cross-Session User Memory

Manages persistent memory about each user:
- Key facts extracted from conversations (via Llama 3.1)
- Detected behavioral patterns across sessions
- Risk level tracking from sentiment history
- Builds context prompt injected into the LLM system prompt
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from ..database import get_database
from ..models.memory import UserMemory

logger = logging.getLogger(__name__)

# Max facts to keep per user (oldest pruned when exceeded)
MAX_FACTS = 50
MAX_PATTERNS = 20


class MemoryService:
    """Static-method service for AI user memory persistence."""

    @staticmethod
    async def _get_collection():
        db = await get_database()
        return db.user_memory

    @staticmethod
    async def get_memory(user_id: str) -> UserMemory:
        """Fetch stored memory for a user. Returns empty memory if none exists."""
        collection = await MemoryService._get_collection()
        doc = await collection.find_one({"user_id": user_id})
        if doc:
            return UserMemory.from_doc(doc)
        return UserMemory(user_id=user_id)

    @staticmethod
    async def save_memory(memory: UserMemory) -> None:
        """Upsert the user's memory document."""
        collection = await MemoryService._get_collection()
        memory.last_updated = datetime.now(timezone.utc)
        await collection.update_one(
            {"user_id": memory.user_id},
            {"$set": memory.model_dump()},
            upsert=True,
        )

    @staticmethod
    async def update_memory_from_conversation(
        user_id: str,
        messages: List[dict],
        model_service=None,
    ) -> None:
        """
        After a chat exchange, use Llama to extract new facts about the user
        and append them to persistent memory (deduplicating).

        `messages` should be the recent conversation turns in
        [{"role": "user"|"assistant", "content": "..."}] format.

        `model_service` is optionally injected for testability; defaults to
        the real ModelService import.
        """
        if not messages:
            return

        if model_service is None:
            from .model_service import ModelService
            model_service = ModelService

        memory = await MemoryService.get_memory(user_id)
        existing_facts = memory.facts

        # Build extraction prompt — ask Llama to identify new facts only
        conversation_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'AI'}: {m['content']}"
            for m in messages[-6:]  # last 3 exchanges
        )

        extraction_prompt = (
            "You are a memory extraction assistant. Given the conversation below, "
            "extract key facts about the user that would be useful for a therapist AI "
            "to remember in future sessions. Focus on:\n"
            "- Personal details (age, job, family, hobbies)\n"
            "- Mental health concerns or symptoms mentioned\n"
            "- Coping strategies they use or want to try\n"
            "- Triggers, stressors, or recurring themes\n"
            "- Progress or positive changes mentioned\n\n"
            f"Already known facts (do NOT repeat these):\n"
            f"{chr(10).join(f'- {f}' for f in existing_facts[-15:]) if existing_facts else '- None yet'}\n\n"
            f"Conversation:\n{conversation_text}\n\n"
            "Return ONLY a JSON array of new fact strings. "
            "If no new facts, return []. Example: [\"User works as a teacher\", \"Has trouble sleeping\"]"
        )

        try:
            raw_response = await model_service.generate_response(
                message=extraction_prompt,
                conversation_history=[],
                user_context=None,
                max_tokens=200,
            )

            # Parse JSON array from response
            new_facts = MemoryService._parse_facts(raw_response)

            if new_facts:
                # Deduplicate against existing facts (case-insensitive)
                existing_lower = {f.lower() for f in existing_facts}
                unique_new = [f for f in new_facts if f.lower() not in existing_lower]

                if unique_new:
                    memory.facts.extend(unique_new)
                    # Prune oldest if over limit
                    if len(memory.facts) > MAX_FACTS:
                        memory.facts = memory.facts[-MAX_FACTS:]
                    memory.session_count += 1
                    await MemoryService.save_memory(memory)
                    logger.info(
                        f"Memory updated for user {user_id}: +{len(unique_new)} facts"
                    )

        except Exception as e:
            # Memory extraction is best-effort — never block the chat
            logger.warning(f"Memory extraction failed for user {user_id}: {e}")

    @staticmethod
    def _parse_facts(raw: str) -> List[str]:
        """Extract a list of strings from the LLM's JSON-like response."""
        import json

        # Try direct JSON parse first
        raw = raw.strip()
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(f).strip() for f in parsed if str(f).strip()]
        except json.JSONDecodeError:
            pass

        # Fallback: extract anything between [ and ]
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            try:
                parsed = json.loads(raw[start : end + 1])
                if isinstance(parsed, list):
                    return [str(f).strip() for f in parsed if str(f).strip()]
            except json.JSONDecodeError:
                pass

        # Last resort: treat each non-empty line starting with - or * as a fact
        facts = []
        for line in raw.split("\n"):
            line = line.strip().lstrip("-*•").strip()
            if line and len(line) > 5:
                facts.append(line)
        return facts[:10]

    @staticmethod
    async def update_risk_level(user_id: str) -> str:
        """
        Compute risk level from the user's recent sentiment history.
        Checks last 7 days of journal sentiments + crisis events.
        Returns the new risk level.
        """
        db = await get_database()
        memory = await MemoryService.get_memory(user_id)
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)

        # Count negative sentiments in recent journals
        journals = db.journals
        negative_count = await journals.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": cutoff},
            "sentiment_label": {"$in": ["negative", "very_negative"]},
        })

        # Count recent crisis events
        crisis_col = db.crisis_events
        crisis_count = await crisis_col.count_documents({
            "user_id": user_id,
            "created_at": {"$gte": cutoff},
        })

        # Determine risk level
        if crisis_count >= 2 or negative_count >= 7:
            new_level = "crisis"
        elif crisis_count >= 1 or negative_count >= 5:
            new_level = "high"
        elif negative_count >= 3:
            new_level = "moderate"
        else:
            new_level = "low"

        if memory.risk_level != new_level:
            memory.risk_level = new_level
            await MemoryService.save_memory(memory)
            logger.info(f"Risk level for user {user_id}: {new_level}")

        return new_level

    @staticmethod
    async def build_memory_prompt(user_id: str, user_doc: dict = None) -> str:
        """
        Build a context string to inject into the LLM system prompt.
        Combines user demographics + stored memory facts + risk level.
        """
        memory = await MemoryService.get_memory(user_id)
        parts = []

        # Demographics from user document
        if user_doc:
            demo_parts = []
            if user_doc.get("full_name"):
                demo_parts.append(f"Name: {user_doc['full_name']}")
            if user_doc.get("age"):
                demo_parts.append(f"Age: {user_doc['age']}")
            if user_doc.get("gender"):
                demo_parts.append(f"Gender: {user_doc['gender']}")
            if user_doc.get("profession"):
                demo_parts.append(f"Profession: {user_doc['profession']}")
            if user_doc.get("location"):
                demo_parts.append(f"Location: {user_doc['location']}")
            if demo_parts:
                parts.append("Demographics: " + ", ".join(demo_parts))

        # Stored facts
        if memory.facts:
            parts.append(
                "What you remember about this user from previous sessions:\n"
                + "\n".join(f"- {f}" for f in memory.facts[-20:])
            )

        # Detected patterns
        if memory.detected_patterns:
            parts.append(
                "Recurring patterns you've noticed:\n"
                + "\n".join(f"- {p}" for p in memory.detected_patterns[-10:])
            )

        # Risk context
        if memory.risk_level in ("high", "crisis"):
            parts.append(
                f"⚠ ALERT: This user's current risk level is {memory.risk_level.upper()}. "
                "Be especially attentive, validate their feelings, and gently suggest "
                "professional help if appropriate."
            )

        # Session count
        if memory.session_count > 0:
            parts.append(
                f"This is approximately session #{memory.session_count + 1} with this user."
            )

        return "\n\n".join(parts) if parts else ""
