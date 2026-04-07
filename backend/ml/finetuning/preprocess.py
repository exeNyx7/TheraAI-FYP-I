"""
preprocess.py
-------------
Converts the raw downloaded datasets into a unified (instruction, input, output)
format suitable for instruction-tuning / conversation finetuning.

Pipeline:
  1. Load raw JSONL files produced by download_datasets.py
  2. Normalise each dataset into a shared schema
  3. Filter harmful / crisis / medically-inappropriate examples
  4. Deduplicate
  5. Split into train / val / test (80 / 10 / 10)
  6. Save as JSONL in data/processed/

Output schema (each line in the JSONL):
  {
    "instruction": "You are a compassionate mental health support assistant...",
    "input": "<user message or conversation history>",
    "output": "<therapist/assistant response>",
    "source": "<dataset name>",
    "emotion": "<emotion label if available, else null>"
  }

Run:
    python preprocess.py [--data-dir ./data] [--output-dir ./data/processed]
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Generator

try:
    from tqdm import tqdm
except ImportError:
    def tqdm(iterable, **kwargs):  # noqa: E302
        return iterable


# ---------------------------------------------------------------------------
# Shared instruction prefix used in every training example
# ---------------------------------------------------------------------------
SYSTEM_INSTRUCTION = (
    "You are TherapAI, a compassionate and professional mental health support assistant. "
    "Your role is to listen empathetically, ask thoughtful questions, and offer evidence-based "
    "coping strategies grounded in CBT and DBT techniques. You do not diagnose or prescribe. "
    "For crisis situations, always refer to professional help and provide hotline information. "
    "Respond in a warm, non-judgmental, culturally sensitive manner."
)


# ---------------------------------------------------------------------------
# Harmful / crisis / inappropriate content filters
# ---------------------------------------------------------------------------
# These patterns trigger *removal* of an example from the training set.
# We do NOT want the model to learn to provide these kinds of responses.
HARMFUL_PATTERNS = [
    # Suicide / self-harm instructions (keep crisis *support*, remove *instructions*)
    r"\b(how\s+to\s+(kill|harm|hurt)\s+(yourself|myself))\b",
    r"\b(method(s)?\s+for\s+suicide)\b",
    r"\b(best\s+way\s+to\s+die)\b",
    # Drug / substance misuse instructions
    r"\b(how\s+to\s+(get|obtain|make|synthesize)\s+(drugs?|meth|heroin|fentanyl))\b",
    # Explicit medical dosage advice
    r"\b(take\s+\d+\s*(mg|ml|pills?|tablets?)\s+of\b)",
    r"\b(prescri(be|ption))\b",
    # Clearly abusive / offensive language in the response field
    r"\b(fuck|shit|bitch|asshole|retard)\b",
    # Responses that are suspiciously short (< 10 chars) or empty
]

# Patterns that indicate a *crisis* example — these are KEPT but flagged
CRISIS_PATTERNS = [
    r"\b(suicid(e|al)|self.?harm|want\s+to\s+die|end\s+(my|their)\s+life)\b",
    r"\b(kill\s+(myself|yourself|himself|herself))\b",
    r"\b(don'?t\s+want\s+to\s+(live|be\s+alive))\b",
    r"\b(hurt(ing)?\s+(myself|yourself))\b",
]

MIN_OUTPUT_CHARS = 20    # responses shorter than this are discarded
MAX_OUTPUT_CHARS = 2000  # responses longer than this are truncated


def _is_harmful(text: str) -> bool:
    """Return True if the response text contains harmful / inappropriate content."""
    t = text.lower()
    for pat in HARMFUL_PATTERNS:
        if re.search(pat, t, re.IGNORECASE):
            return True
    if len(text.strip()) < MIN_OUTPUT_CHARS:
        return True
    return False


def _is_crisis(text: str) -> bool:
    """Return True if the text contains crisis-related content."""
    t = text.lower()
    for pat in CRISIS_PATTERNS:
        if re.search(pat, t, re.IGNORECASE):
            return True
    return False


def _clean_text(text: str) -> str:
    """Basic text cleaning — strip HTML tags, normalise whitespace."""
    text = re.sub(r"<[^>]+>", " ", text)         # remove HTML tags
    text = re.sub(r"http\S+", "[link]", text)     # anonymise URLs
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > MAX_OUTPUT_CHARS:
        # Truncate at sentence boundary when possible
        sentences = re.split(r"(?<=[.!?])\s+", text[:MAX_OUTPUT_CHARS])
        text = " ".join(sentences[:-1]) if len(sentences) > 1 else text[:MAX_OUTPUT_CHARS]
    return text


# ---------------------------------------------------------------------------
# Dataset-specific normalisation functions
# Each returns a generator of dicts matching the output schema.
# ---------------------------------------------------------------------------

def normalise_counsel_chat(raw_dir: Path) -> Generator[dict, None, None]:
    """
    counsel-chat schema:
      questionTitle, questionText, questionLink, topic, therapistInfo,
      therapistURL, answerText, upvotes, views
    We use questionText as input and answerText as output.
    """
    for split_file in raw_dir.glob("*.jsonl"):
        with open(split_file, encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                user_msg  = _clean_text(row.get("questionText", ""))
                ai_resp   = _clean_text(row.get("answerText", ""))
                topic     = row.get("topic", "")

                if not user_msg or not ai_resp:
                    continue
                if _is_harmful(ai_resp):
                    continue

                # Build a richer input with topic context if available
                input_text = user_msg
                if topic:
                    input_text = f"[Topic: {topic}]\n{user_msg}"

                yield {
                    "instruction": SYSTEM_INSTRUCTION,
                    "input": input_text,
                    "output": ai_resp,
                    "source": "counsel_chat",
                    "emotion": None,
                    "is_crisis": _is_crisis(user_msg),
                }


def normalise_empathetic_dialogues(raw_dir: Path) -> Generator[dict, None, None]:
    """
    empathetic_dialogues schema:
      conv_id, utterance_idx, context, prompt, selfeval, tags, utterance, speaker_idx
    'context' is the conversation history (turns separated by '_comma_').
    'utterance' is the next turn.
    We treat the last human turn (context[-1]) as input and the response as output.
    We only use even-indexed utterances (assistant turns) as output examples.
    """
    for split_file in raw_dir.glob("*.jsonl"):
        with open(split_file, encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                utterance_idx = row.get("utterance_idx", 0)
                # Only use assistant turns (odd index = listener turn)
                if utterance_idx % 2 == 0:
                    continue

                history_raw = row.get("context", "")
                emotion     = row.get("context", "").split("_comma_")[0] if "_comma_" in str(row.get("prompt", "")) else row.get("prompt", "")
                utterance   = _clean_text(row.get("utterance", ""))

                # Parse history: turns are pipe-separated in 'context'
                history_turns = [
                    t.replace("_comma_", ",").strip()
                    for t in str(history_raw).split("|")
                    if t.strip()
                ]

                if not history_turns or not utterance:
                    continue
                if _is_harmful(utterance):
                    continue

                # Use last user message as input, full history as context
                last_user_msg = _clean_text(history_turns[-1]) if history_turns else ""
                if len(history_turns) > 1:
                    context_str = "\n".join(
                        f"{'User' if i % 2 == 0 else 'Assistant'}: {t}"
                        for i, t in enumerate(history_turns[:-1])
                    )
                    input_text = f"{context_str}\nUser: {last_user_msg}"
                else:
                    input_text = last_user_msg

                # Extract emotion from prompt field
                emotion_label = str(row.get("prompt", "")).strip() or None

                yield {
                    "instruction": SYSTEM_INSTRUCTION,
                    "input": input_text,
                    "output": utterance,
                    "source": "empathetic_dialogues",
                    "emotion": emotion_label,
                    "is_crisis": _is_crisis(last_user_msg),
                }


def normalise_mental_health_counseling(raw_dir: Path) -> Generator[dict, None, None]:
    """
    mental_health_counseling_conversations schema:
      Context (user message), Response (counsellor reply)
    """
    for split_file in raw_dir.glob("*.jsonl"):
        with open(split_file, encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                user_msg = _clean_text(row.get("Context", ""))
                ai_resp  = _clean_text(row.get("Response", ""))

                if not user_msg or not ai_resp:
                    continue
                if _is_harmful(ai_resp):
                    continue

                yield {
                    "instruction": SYSTEM_INSTRUCTION,
                    "input": user_msg,
                    "output": ai_resp,
                    "source": "mental_health_counseling",
                    "emotion": None,
                    "is_crisis": _is_crisis(user_msg),
                }


NORMALISERS = {
    "counsel_chat":             normalise_counsel_chat,
    "empathetic_dialogues":     normalise_empathetic_dialogues,
    "mental_health_counseling": normalise_mental_health_counseling,
}


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------
def fingerprint(example: dict) -> str:
    """MD5 fingerprint of (input, output) pair for deduplication."""
    key = (example["input"] + "|||" + example["output"]).lower().strip()
    return hashlib.md5(key.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Train / val / test split
# ---------------------------------------------------------------------------
def split_examples(examples: list[dict], train=0.8, val=0.1) -> tuple[list, list, list]:
    import random
    random.seed(42)
    random.shuffle(examples)
    n = len(examples)
    t = int(n * train)
    v = int(n * (train + val))
    return examples[:t], examples[t:v], examples[v:]


# ---------------------------------------------------------------------------
# JSONL I/O helpers
# ---------------------------------------------------------------------------
def save_jsonl(examples: list[dict], path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Preprocess therapy datasets for finetuning")
    parser.add_argument("--data-dir",    default="./data",           help="Root data directory")
    parser.add_argument("--output-dir",  default="./data/processed", help="Output directory for JSONL files")
    parser.add_argument("--no-dedup",    action="store_true",        help="Skip deduplication step")
    parser.add_argument("--keep-crisis", action="store_true",
                        help="Keep crisis examples in training data (default: move to separate file)")
    args = parser.parse_args()

    raw_dir    = Path(args.data_dir) / "raw"
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    all_examples  = []
    crisis_examples = []
    seen_hashes   = set()
    stats = {ds: {"loaded": 0, "filtered_harmful": 0, "deduped": 0, "crisis": 0} for ds in NORMALISERS}

    for ds_name, normalise_fn in NORMALISERS.items():
        ds_raw_dir = raw_dir / ds_name
        if not ds_raw_dir.exists():
            print(f"  SKIP {ds_name}: {ds_raw_dir} not found (run download_datasets.py first)")
            continue

        print(f"\nProcessing: {ds_name}")
        count = 0
        for ex in tqdm(normalise_fn(ds_raw_dir), desc=f"  {ds_name}"):
            stats[ds_name]["loaded"] += 1
            count += 1

            # Deduplication
            if not args.no_dedup:
                fp = fingerprint(ex)
                if fp in seen_hashes:
                    stats[ds_name]["deduped"] += 1
                    continue
                seen_hashes.add(fp)

            # Separate crisis examples
            if ex.pop("is_crisis", False) and not args.keep_crisis:
                stats[ds_name]["crisis"] += 1
                crisis_examples.append(ex)
                continue

            all_examples.append(ex)

        print(f"  Loaded {stats[ds_name]['loaded']:,} raw  |  "
              f"deduped {stats[ds_name]['deduped']:,}  |  "
              f"crisis {stats[ds_name]['crisis']:,}  |  "
              f"kept {count - stats[ds_name]['deduped'] - stats[ds_name]['crisis']:,}")

    if not all_examples:
        sys.exit("No examples to process. Make sure you ran download_datasets.py first.")

    # Split
    train_ex, val_ex, test_ex = split_examples(all_examples)
    print(f"\nSplit sizes — train: {len(train_ex):,}  val: {len(val_ex):,}  test: {len(test_ex):,}")
    if crisis_examples:
        print(f"Crisis examples (held out): {len(crisis_examples):,}")

    # Save
    save_jsonl(train_ex,    output_dir / "train.jsonl")
    save_jsonl(val_ex,      output_dir / "val.jsonl")
    save_jsonl(test_ex,     output_dir / "test.jsonl")
    if crisis_examples:
        save_jsonl(crisis_examples, output_dir / "crisis_holdout.jsonl")
        print(f"  Crisis holdout → {output_dir / 'crisis_holdout.jsonl'}")

    # Metadata
    meta = {
        "total_examples":   len(all_examples),
        "train":            len(train_ex),
        "val":              len(val_ex),
        "test":             len(test_ex),
        "crisis_holdout":   len(crisis_examples),
        "by_source": {
            ds: sum(1 for e in all_examples if e["source"] == ds)
            for ds in NORMALISERS
        },
        "schema": {
            "instruction": "System prompt / role description",
            "input":       "User message or conversation history",
            "output":      "Therapist / assistant response",
            "source":      "Dataset origin",
            "emotion":     "Emotion label (if available)",
        },
    }
    with open(output_dir / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\nSaved processed data → {output_dir}")
    print(f"  train.jsonl        {len(train_ex):,} rows")
    print(f"  val.jsonl          {len(val_ex):,} rows")
    print(f"  test.jsonl         {len(test_ex):,} rows")
    print(f"  metadata.json")
    print(f"\nNext step: python finetune.py --data-dir {args.output_dir}")


if __name__ == "__main__":
    main()
