"""
integration_example.py
----------------------
Shows how to swap the finetuned LoRA adapter into TheraAI's ModelService
once training is complete.

This file is NOT meant to be run directly — it contains annotated code
snippets showing the exact changes to make to:

  backend/app/services/model_service.py

TWO integration modes are provided:

  Mode A — Local HuggingFace adapter (DialoGPT or Flan-T5 + LoRA)
  Mode B — Keep Ollama as primary, fall back to local adapter if Ollama is down

The recommended approach for FYP demo is Mode B (Ollama primary).
Use Mode A only if you have trained a strong enough adapter and want
to run fully offline without Ollama.

USAGE DECISION TREE:
  - Ollama running + decent adapter trained → Mode B (best of both worlds)
  - No Ollama, good GPU + adapter trained   → Mode A
  - No Ollama, no GPU, adapter trained      → Mode A (slow, CPU inference)
  - Just using Ollama                        → Keep existing model_service.py as-is
"""

# =============================================================================
# MODE A — Full replacement: use finetuned local adapter as primary LLM
# =============================================================================
#
# Replace backend/app/services/model_service.py with this class:
# (drop in as a replacement for the existing ModelService)

MODE_A_CODE = '''
# backend/app/services/model_service.py  (Mode A — local adapter)
"""
ModelService — Local finetuned therapy adapter (DialoGPT-medium + LoRA)
Replaces Ollama when running fully offline.
"""

import asyncio
import logging
import os
from functools import lru_cache
from pathlib import Path

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

logger = logging.getLogger(__name__)

# Path to the saved LoRA adapter (output of finetune.py)
# Override via env var:  THERAAI_ADAPTER_DIR=/path/to/adapter
ADAPTER_DIR = os.getenv(
    "THERAAI_ADAPTER_DIR",
    str(Path(__file__).parent.parent.parent.parent / "ml" / "finetuning" / "checkpoints" / "dialogpt-theraai" / "final")
)
BASE_MODEL_ID = "microsoft/DialoGPT-medium"

THERAPIST_SYSTEM_PROMPT = (
    "You are TherapAI, a compassionate mental health support assistant. "
    "Listen empathetically, use CBT/DBT techniques, and refer to hotlines for crises."
)


class _LocalModelState:
    """Singleton holding loaded model + tokenizer (loaded once at startup)."""
    model: object = None
    tokenizer: object = None
    device: str = "cpu"
    ready: bool = False


_state = _LocalModelState()


def _load_model():
    """Load base model + LoRA adapter into _state. Call once at startup."""
    global _state
    if _state.ready:
        return

    logger.info(f"Loading base model: {BASE_MODEL_ID}")
    device = "cpu"
    if torch.cuda.is_available():
        cap = torch.cuda.get_device_capability()
        if cap[0] * 10 + cap[1] < 120:      # exclude RTX 5060 sm_120
            device = "cuda"

    dtype = torch.float16 if device == "cuda" else torch.float32
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_ID, torch_dtype=dtype, low_cpu_mem_usage=True
    ).to(device)

    adapter_path = Path(ADAPTER_DIR)
    if adapter_path.exists():
        logger.info(f"Loading LoRA adapter from {adapter_path}")
        model = PeftModel.from_pretrained(base, str(adapter_path))
        logger.info("Finetuned adapter loaded successfully")
    else:
        logger.warning(f"Adapter not found at {adapter_path}. Using base model.")
        model = base

    model.eval()
    _state.model     = model
    _state.tokenizer = tokenizer
    _state.device    = device
    _state.ready     = True
    logger.info(f"Local model ready on {device}")


class ModelService:
    """
    Drop-in replacement for the Ollama-based ModelService.
    Same public interface: generate_response(), check_health().
    """

    @staticmethod
    async def generate_response(
        user_message: str,
        conversation_history: list[dict] | None = None,
    ) -> str:
        """Generate a therapy response using the local finetuned model."""
        if not _state.ready:
            logger.warning("Model not loaded yet — using fallback")
            return ModelService.generate_fallback_response(user_message)

        # Build prompt from history + current message
        prompt_parts = [THERAPIST_SYSTEM_PROMPT]
        for turn in (conversation_history or [])[-6:]:   # last 3 exchanges
            role    = turn.get("role", "user")
            content = turn.get("content") or turn.get("message", "")
            speaker = "User" if role == "user" else "TherapAI"
            prompt_parts.append(f"{speaker}: {content}")
        prompt_parts.append(f"User: {user_message}")
        prompt_parts.append("TherapAI:")
        prompt = "\\n".join(prompt_parts)

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            _generate_sync,
            prompt,
        )
        return response or ModelService.generate_fallback_response(user_message)

    @staticmethod
    async def check_health() -> dict:
        return {
            "status":   "healthy" if _state.ready else "loading",
            "backend":  "local_adapter",
            "model":    BASE_MODEL_ID,
            "adapter":  ADAPTER_DIR,
            "device":   _state.device,
        }

    @staticmethod
    def generate_fallback_response(user_message: str) -> str:
        # (same fallback logic as the Ollama-based ModelService)
        import re
        msg = user_message.lower()
        crisis_keywords = ["suicide", "suicidal", "kill myself", "end my life", "self-harm"]
        if any(kw in msg for kw in crisis_keywords):
            return (
                "I can hear that you\'re in a lot of pain right now, and I\'m deeply concerned. "
                "Please reach out to a crisis helpline immediately. In Pakistan, you can call "
                "Umang at 0317-4288665. You don\'t have to face this alone."
            )
        return (
            "Thank you for sharing that with me. It takes courage to talk about what you\'re "
            "going through. Could you tell me a little more about how you\'re feeling?"
        )


def _generate_sync(prompt: str, max_new_tokens: int = 200) -> str:
    """Synchronous generation — run via executor to avoid blocking the event loop."""
    tokenizer = _state.tokenizer
    model     = _state.model
    device    = _state.device

    inputs = tokenizer(
        prompt, return_tensors="pt", truncation=True, max_length=512
    ).to(device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.3,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
    new_tokens = output_ids[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


def get_model_service() -> type[ModelService]:
    return ModelService
'''


# =============================================================================
# MODE B — Hybrid: Ollama primary, finetuned adapter as fallback
# =============================================================================
#
# Only ONE function in the existing model_service.py needs to change:
# generate_response()  →  try Ollama first, catch exception, use local adapter

MODE_B_PATCH = '''
# --- Patch to apply to backend/app/services/model_service.py ---
#
# 1. Add these imports at the top of model_service.py:
#
#    from pathlib import Path
#    import torch
#    from transformers import AutoTokenizer, AutoModelForCausalLM
#    from peft import PeftModel
#
# 2. Add this constant near the top:
#
ADAPTER_DIR = os.getenv(
    "THERAAI_ADAPTER_DIR",
    str(Path(__file__).parent.parent.parent / "ml" / "finetuning" / "checkpoints" / "dialogpt-theraai" / "final")
)
#
# 3. Replace the existing generate_response() in ModelService with:

    @staticmethod
    async def generate_response(
        user_message: str,
        conversation_history: list[dict] | None = None,
    ) -> str:
        """
        Try Ollama/Llama 3.1 first.
        If Ollama is unavailable, fall back to local finetuned DialoGPT adapter.
        If adapter not trained yet, use keyword fallback.
        """
        # --- PRIMARY: Ollama ---
        try:
            messages = [{"role": "system", "content": THERAPIST_SYSTEM_PROMPT}]
            for turn in (conversation_history or [])[-MAX_HISTORY_MESSAGES:]:
                role    = turn.get("role", "user")
                content = turn.get("content") or turn.get("message", "")
                if role in ("bot", "assistant"):
                    role = "assistant"
                elif role != "user":
                    continue
                messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": user_message})

            async with httpx.AsyncClient(timeout=RESPONSE_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={"model": OLLAMA_MODEL, "messages": messages, "stream": False,
                          "options": {"num_predict": MAX_TOKENS, "temperature": 0.7}},
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("message", {}).get("content", "").strip()
        except Exception as ollama_err:
            logger.warning(f"Ollama unavailable ({ollama_err}). Trying local adapter...")

        # --- FALLBACK A: local finetuned adapter ---
        adapter_path = Path(ADAPTER_DIR)
        if adapter_path.exists():
            try:
                return await _generate_local_adapter(user_message, conversation_history)
            except Exception as local_err:
                logger.error(f"Local adapter error: {local_err}")

        # --- FALLBACK B: keyword responses ---
        return ModelService.generate_fallback_response(user_message)


# 4. Add this helper function outside the class in model_service.py:

_local_model_cache: dict = {}    # {"model": ..., "tokenizer": ...}

async def _generate_local_adapter(
    user_message: str,
    conversation_history: list[dict] | None,
) -> str:
    """Load the LoRA adapter once and generate a response."""
    global _local_model_cache

    loop = asyncio.get_event_loop()

    def _load_and_generate():
        if not _local_model_cache:
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM
            from peft import PeftModel

            device = "cpu"
            if torch.cuda.is_available():
                cap = torch.cuda.get_device_capability()
                if cap[0] * 10 + cap[1] < 120:
                    device = "cuda"

            dtype = torch.float16 if device == "cuda" else torch.float32
            tok = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
            if tok.pad_token is None:
                tok.pad_token = tok.eos_token
            base = AutoModelForCausalLM.from_pretrained(
                "microsoft/DialoGPT-medium", torch_dtype=dtype
            ).to(device)
            mdl = PeftModel.from_pretrained(base, ADAPTER_DIR)
            mdl.eval()
            _local_model_cache["model"]     = mdl
            _local_model_cache["tokenizer"] = tok
            _local_model_cache["device"]    = device

        tok    = _local_model_cache["tokenizer"]
        mdl    = _local_model_cache["model"]
        device = _local_model_cache["device"]

        parts = [THERAPIST_SYSTEM_PROMPT]
        for turn in (conversation_history or [])[-4:]:
            role    = "User" if turn.get("role") == "user" else "TherapAI"
            content = turn.get("content") or turn.get("message", "")
            parts.append(f"{role}: {content}")
        parts.append(f"User: {user_message}\\nTherapAI:")
        prompt = "\\n".join(parts)

        inputs = tok(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)
        with torch.no_grad():
            out = mdl.generate(
                **inputs, max_new_tokens=150, do_sample=True,
                temperature=0.7, top_p=0.9, repetition_penalty=1.3,
                pad_token_id=tok.pad_token_id, eos_token_id=tok.eos_token_id,
            )
        new_toks = out[0][inputs["input_ids"].shape[1]:]
        return tok.decode(new_toks, skip_special_tokens=True).strip()

    return await loop.run_in_executor(None, _load_and_generate)
'''


# =============================================================================
# STEP-BY-STEP INTEGRATION GUIDE (printed when run directly)
# =============================================================================
if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║   TheraAI — Finetuned Model Integration Guide                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  PREREQUISITE: Run the full pipeline first                           ║
║    python download_datasets.py                                       ║
║    python preprocess.py                                              ║
║    python finetune.py --model dialogpt --epochs 3                    ║
║    python evaluate.py --adapter-dir ./checkpoints/dialogpt-theraai/final
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  MODE A — Replace Ollama with local adapter (fully offline)          ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  1. Copy the contents of MODE_A_CODE (see this file) to             ║
║       backend/app/services/model_service.py                          ║
║                                                                      ║
║  2. Set the environment variable:                                    ║
║       THERAAI_ADAPTER_DIR=/absolute/path/to/checkpoints/             ║
║                              dialogpt-theraai/final                  ║
║                                                                      ║
║  3. In main.py lifespan, trigger adapter loading at startup:         ║
║       from .services.model_service import _load_model                ║
║       import threading                                               ║
║       threading.Thread(target=_load_model, daemon=True).start()      ║
║                                                                      ║
║  4. The /health endpoint will show:                                  ║
║       "chat_ai": {"backend": "local_adapter", "status": "healthy"}  ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  MODE B — Ollama primary, finetuned adapter as fallback (recommended)║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  1. Keep existing model_service.py (Ollama-based)                   ║
║                                                                      ║
║  2. Apply the patch from MODE_B_PATCH (see this file):              ║
║     - Add ADAPTER_DIR constant                                       ║
║     - Replace generate_response() with the patched version          ║
║     - Add _generate_local_adapter() helper function                 ║
║                                                                      ║
║  3. Ollama is tried first. If it fails (not running / timeout),      ║
║     the finetuned adapter kicks in automatically.                   ║
║                                                                      ║
║  4. Set THERAAI_ADAPTER_DIR if adapter is in a non-default path.    ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  ENVIRONMENT VARIABLES                                               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  THERAAI_ADAPTER_DIR   Path to saved LoRA adapter directory         ║
║  OLLAMA_MODEL          Ollama model name   (default: llama3.1:8b)   ║
║  OLLAMA_BASE_URL       Ollama server URL   (default: localhost:11434)║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
""")

    print("MODE A CODE — paste into backend/app/services/model_service.py:")
    print("─" * 70)
    print(MODE_A_CODE[:500] + "\n... (see file for full code)")

    print("\nMODE B PATCH — apply to existing model_service.py:")
    print("─" * 70)
    print(MODE_B_PATCH[:500] + "\n... (see file for full patch)")
