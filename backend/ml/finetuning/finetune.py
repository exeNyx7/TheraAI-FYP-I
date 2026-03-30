"""
finetune.py
-----------
LoRA (Low-Rank Adaptation) finetuning for the TheraAI therapy chatbot.

Supported base models:
  --model dialogpt    microsoft/DialoGPT-medium  (~345 MB, fast, causal LM)
  --model flan-t5     google/flan-t5-large        (~780 MB, seq2seq, instruction-tuned)

LoRA means only ~1-5% of parameters are trainable, so this runs on:
  - RTX 3070  8GB  →  ~20-30 min / epoch  (FP16)
  - RTX 5060  8GB  →  CPU fallback for HF models  (~4-8 hrs / epoch)
  - CPU only       →  feasible for small data      (~12-24 hrs / epoch)
  - Colab T4  15GB →  ~10-15 min / epoch  (best free option)

Run:
    python finetune.py --model dialogpt --data-dir ./data/processed --output-dir ./checkpoints
    python finetune.py --model flan-t5  --data-dir ./data/processed --output-dir ./checkpoints

Checkpoints are saved every 500 steps to  <output-dir>/<model>-theraai/
"""

import argparse
import json
import logging
import math
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
try:
    import torch
    from datasets import Dataset
    from transformers import (
        AutoTokenizer,
        AutoModelForCausalLM,
        AutoModelForSeq2SeqLM,
        TrainingArguments,
        Trainer,
        DataCollatorForSeq2Seq,
        DataCollatorWithPadding,
        EarlyStoppingCallback,
        set_seed,
    )
    from peft import (
        LoraConfig,
        TaskType,
        get_peft_model,
        prepare_model_for_kbit_training,
    )
except ImportError as e:
    sys.exit(
        f"Missing dependency: {e}\n"
        "Install with:\n"
        "  pip install peft transformers accelerate datasets bitsandbytes"
    )

logging.basicConfig(
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Model configurations
# ---------------------------------------------------------------------------
@dataclass
class ModelConfig:
    hf_id:          str
    task_type:      TaskType          # CAUSAL_LM or SEQ_2_SEQ_LM
    target_modules: list[str]         # which linear layers LoRA patches
    max_input_len:  int
    max_output_len: int
    lora_r:         int = 16
    lora_alpha:     int = 32
    lora_dropout:   float = 0.1


MODEL_CONFIGS = {
    "dialogpt": ModelConfig(
        hf_id="microsoft/DialoGPT-medium",
        task_type=TaskType.CAUSAL_LM,
        # GPT-2 architecture: attention is in 'c_attn' (combined Q/K/V)
        target_modules=["c_attn", "c_proj"],
        max_input_len=512,
        max_output_len=128,
    ),
    "flan-t5": ModelConfig(
        hf_id="google/flan-t5-large",
        task_type=TaskType.SEQ_2_SEQ_LM,
        # T5 attention projections
        target_modules=["q", "v"],
        max_input_len=512,
        max_output_len=256,
        lora_r=8,          # flan-t5-large is wider; r=8 is enough
        lora_alpha=16,
    ),
}


# ---------------------------------------------------------------------------
# Dataset loading & tokenisation
# ---------------------------------------------------------------------------
def load_jsonl(path: Path) -> list[dict]:
    examples = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))
    return examples


def build_prompt_dialogpt(example: dict) -> str:
    """
    DialoGPT uses a concatenated conversation string ended with EOS tokens.
    Format:  <instruction>\n<input><EOS><output><EOS>
    """
    return (
        f"{example['instruction']}\n"
        f"User: {example['input']}\n"
        f"TherapAI:"
    )


def build_prompt_flant5(example: dict) -> str:
    """Flan-T5 expects an instruction-input format as encoder input."""
    return (
        f"Instruction: {example['instruction']}\n"
        f"User message: {example['input']}\n"
        f"Compassionate response:"
    )


def tokenise_dialogpt(example: dict, tokenizer, cfg: ModelConfig) -> dict:
    """
    For causal LM: tokenise prompt+response as one sequence.
    Labels = -100 for prompt tokens (we only compute loss on the response).
    """
    prompt   = build_prompt_dialogpt(example)
    response = " " + example["output"] + tokenizer.eos_token

    prompt_ids   = tokenizer.encode(prompt,   add_special_tokens=False)
    response_ids = tokenizer.encode(response, add_special_tokens=False)

    total = cfg.max_input_len + cfg.max_output_len
    input_ids = (prompt_ids + response_ids)[:total]
    labels    = ([-100] * len(prompt_ids) + response_ids)[:total]

    # Pad to max length
    pad_len   = total - len(input_ids)
    input_ids = input_ids + [tokenizer.pad_token_id] * pad_len
    labels    = labels    + [-100]                   * pad_len
    attn_mask = [1] * (total - pad_len) + [0] * pad_len

    return {
        "input_ids":      input_ids,
        "attention_mask": attn_mask,
        "labels":         labels,
    }


def tokenise_flant5(example: dict, tokenizer, cfg: ModelConfig) -> dict:
    """For seq2seq: encode input separately from target (decoder labels)."""
    prompt   = build_prompt_flant5(example)
    response = example["output"]

    model_inputs = tokenizer(
        prompt,
        max_length=cfg.max_input_len,
        padding="max_length",
        truncation=True,
    )
    with tokenizer.as_target_tokenizer():
        labels = tokenizer(
            response,
            max_length=cfg.max_output_len,
            padding="max_length",
            truncation=True,
        )

    # Replace pad token id in labels with -100
    label_ids = [
        (l if l != tokenizer.pad_token_id else -100)
        for l in labels["input_ids"]
    ]
    model_inputs["labels"] = label_ids
    return model_inputs


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def load_model_and_tokenizer(model_key: str, cfg: ModelConfig, device: str):
    """Load base model + tokenizer, then wrap with LoRA."""
    logger.info(f"Loading tokenizer: {cfg.hf_id}")
    tokenizer = AutoTokenizer.from_pretrained(cfg.hf_id)

    # DialoGPT has no pad token by default — use EOS
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    logger.info(f"Loading base model: {cfg.hf_id}")
    load_kwargs = {
        "torch_dtype": torch.float16 if device == "cuda" else torch.float32,
        "low_cpu_mem_usage": True,
    }

    if cfg.task_type == TaskType.CAUSAL_LM:
        model = AutoModelForCausalLM.from_pretrained(cfg.hf_id, **load_kwargs)
    else:
        model = AutoModelForSeq2SeqLM.from_pretrained(cfg.hf_id, **load_kwargs)

    model = model.to(device)

    # LoRA config
    lora_config = LoraConfig(
        r=cfg.lora_r,
        lora_alpha=cfg.lora_alpha,
        lora_dropout=cfg.lora_dropout,
        bias="none",
        task_type=cfg.task_type,
        target_modules=cfg.target_modules,
    )

    model = get_peft_model(model, lora_config)

    trainable, total = model.get_nb_trainable_parameters()
    logger.info(
        f"Trainable parameters: {trainable:,} / {total:,} "
        f"({100 * trainable / total:.2f}%)"
    )

    return model, tokenizer


def build_hf_dataset(
    examples: list[dict],
    tokenizer,
    cfg: ModelConfig,
    model_key: str,
) -> Dataset:
    tokenise_fn = tokenise_dialogpt if model_key == "dialogpt" else tokenise_flant5

    tokenised = [tokenise_fn(ex, tokenizer, cfg) for ex in examples]
    return Dataset.from_list(tokenised)


def train(args):
    set_seed(42)

    cfg = MODEL_CONFIGS[args.model]
    output_dir = Path(args.output_dir) / f"{args.model}-theraai"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Device selection — respect sm_120 (RTX 5060) limitation
    device = "cpu"
    if torch.cuda.is_available():
        capability = torch.cuda.get_device_capability()
        sm = capability[0] * 10 + capability[1]
        if sm >= 120:
            logger.warning(
                "RTX 5060 (sm_120) detected. HuggingFace CUDA support limited. "
                "Training on CPU. For GPU training use Ollama or Google Colab."
            )
        else:
            device = "cuda"
            logger.info(f"GPU detected (sm_{sm}): training on CUDA")
    else:
        logger.info("No CUDA GPU — training on CPU (this will be slow)")

    # Load processed data
    data_dir = Path(args.data_dir)
    logger.info("Loading processed datasets...")
    train_examples = load_jsonl(data_dir / "train.jsonl")
    val_examples   = load_jsonl(data_dir / "val.jsonl")

    # Optional: cap dataset size during debugging
    if args.max_samples:
        train_examples = train_examples[:args.max_samples]
        val_examples   = val_examples[:max(args.max_samples // 8, 50)]
        logger.info(f"Capped to {len(train_examples)} train / {len(val_examples)} val samples")

    logger.info(f"Train: {len(train_examples):,}  |  Val: {len(val_examples):,}")

    model, tokenizer = load_model_and_tokenizer(args.model, cfg, device)

    logger.info("Tokenising datasets...")
    train_dataset = build_hf_dataset(train_examples, tokenizer, cfg, args.model)
    val_dataset   = build_hf_dataset(val_examples,   tokenizer, cfg, args.model)

    # Data collator
    if cfg.task_type == TaskType.SEQ_2_SEQ_LM:
        data_collator = DataCollatorForSeq2Seq(
            tokenizer, model=model, label_pad_token_id=-100
        )
    else:
        data_collator = DataCollatorWithPadding(tokenizer)

    # Batch size: adapt to available memory
    per_device_batch = 4 if device == "cuda" else 2
    grad_accum       = 4                  # effective batch = 16

    # Compute total steps for logging
    steps_per_epoch = math.ceil(len(train_examples) / (per_device_batch * grad_accum))
    total_steps     = steps_per_epoch * args.epochs
    logger.info(
        f"Training plan: {args.epochs} epochs × {steps_per_epoch} steps "
        f"= {total_steps} total steps"
    )

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=per_device_batch,
        per_device_eval_batch_size=per_device_batch,
        gradient_accumulation_steps=grad_accum,
        warmup_steps=min(100, total_steps // 10),
        learning_rate=args.lr,
        weight_decay=0.01,
        fp16=(device == "cuda"),
        logging_dir=str(output_dir / "logs"),
        logging_steps=50,
        eval_strategy="steps",
        eval_steps=500,
        save_strategy="steps",
        save_steps=500,
        save_total_limit=3,                # keep only last 3 checkpoints
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to="none",                  # disable wandb/tensorboard by default
        dataloader_pin_memory=(device == "cuda"),
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )

    logger.info("=" * 60)
    logger.info(f"  Model       : {cfg.hf_id}")
    logger.info(f"  LoRA r      : {cfg.lora_r}  alpha: {cfg.lora_alpha}")
    logger.info(f"  Device      : {device}")
    logger.info(f"  Batch size  : {per_device_batch} × {grad_accum} acc = {per_device_batch * grad_accum}")
    logger.info(f"  Epochs      : {args.epochs}")
    logger.info(f"  Output dir  : {output_dir}")
    logger.info("=" * 60)

    logger.info("Starting training...")
    result = trainer.train()

    logger.info(f"Training complete. Loss: {result.training_loss:.4f}")
    logger.info(f"Saving final model to {output_dir}/final")

    # Save the LoRA adapter weights (NOT the full model — much smaller)
    final_dir = output_dir / "final"
    model.save_pretrained(str(final_dir))
    tokenizer.save_pretrained(str(final_dir))

    # Save training config for evaluate.py / integration
    config_out = {
        "base_model":     cfg.hf_id,
        "model_key":      args.model,
        "lora_r":         cfg.lora_r,
        "lora_alpha":     cfg.lora_alpha,
        "lora_dropout":   cfg.lora_dropout,
        "target_modules": cfg.target_modules,
        "task_type":      str(cfg.task_type),
        "max_input_len":  cfg.max_input_len,
        "max_output_len": cfg.max_output_len,
        "training_loss":  result.training_loss,
        "epochs":         args.epochs,
        "adapter_dir":    str(final_dir),
    }
    with open(output_dir / "training_config.json", "w") as f:
        json.dump(config_out, f, indent=2)

    logger.info(f"\nDone! Adapter saved to: {final_dir}")
    logger.info(f"Next step: python evaluate.py --adapter-dir {final_dir} --model {args.model}")
    return result


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Finetune a therapy chatbot with LoRA/PEFT"
    )
    parser.add_argument(
        "--model", choices=list(MODEL_CONFIGS.keys()), default="dialogpt",
        help="Base model to finetune (default: dialogpt)"
    )
    parser.add_argument("--data-dir",    default="./data/processed",
                        help="Processed JSONL directory (output of preprocess.py)")
    parser.add_argument("--output-dir",  default="./checkpoints",
                        help="Where to save checkpoints and final adapter")
    parser.add_argument("--epochs",      type=int,   default=3,
                        help="Number of training epochs (default: 3)")
    parser.add_argument("--lr",          type=float, default=2e-4,
                        help="Learning rate (default: 2e-4)")
    parser.add_argument("--max-samples", type=int,   default=None,
                        help="Cap training samples (useful for quick testing)")
    args = parser.parse_args()

    # Validate data directory
    data_dir = Path(args.data_dir)
    if not (data_dir / "train.jsonl").exists():
        sys.exit(
            f"train.jsonl not found in {data_dir}. "
            "Run preprocess.py first."
        )

    train(args)


if __name__ == "__main__":
    main()
