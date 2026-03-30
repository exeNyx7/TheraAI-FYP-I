# TheraAI — Therapy Chatbot Finetuning Pipeline

> LoRA-based finetuning of a therapy-domain language model using real counselling datasets.
> Designed to run on a laptop GPU (8 GB VRAM) or CPU. RTX 5060 (sm_120) users: use CPU or Google Colab.

---

## Directory Structure

```
backend/ml/finetuning/
├── download_datasets.py    # Step 1 — Pull raw datasets from HuggingFace Hub
├── preprocess.py           # Step 2 — Normalise, filter, split → JSONL
├── finetune.py             # Step 3 — LoRA finetuning (DialoGPT-medium or Flan-T5-large)
├── evaluate.py             # Step 4 — BLEU/ROUGE + qualitative scenario tests
├── integration_example.py  # Step 5 — How to plug the adapter into ModelService
├── README.md               # This file
├── data/                   # Created at runtime
│   ├── raw/                #   Raw dataset JSONL files
│   └── processed/          #   Normalised train/val/test splits
└── checkpoints/            # Created at runtime
    └── dialogpt-theraai/   #   LoRA adapter checkpoints + final/
```

---

## Datasets Used

| Dataset | Size | Content | Source |
|---------|------|---------|--------|
| `nbertagnolli/counsel-chat` | ~700 Q/A pairs | Real therapist answers from counselchat.com | HuggingFace |
| `facebook/empathetic_dialogues` | ~25k dialogues | Multi-turn empathetic conversations (32 emotion labels) | Facebook Research |
| `Amod/mental_health_counseling_conversations` | ~3k pairs | Curated mental-health counselling exchanges | HuggingFace |

Combined and preprocessed: ~15k–20k training examples after filtering and deduplication.

---

## Quick Start (3 commands)

```bash
cd backend/ml/finetuning

# 1. Install dependencies
pip install datasets transformers peft accelerate sentencepiece tqdm nltk rouge-score

# 2. Download datasets
python download_datasets.py

# 3. Preprocess
python preprocess.py

# 4. Finetune (DialoGPT-medium with LoRA — recommended starting point)
python finetune.py --model dialogpt --epochs 3

# 5. Evaluate
python evaluate.py --adapter-dir ./checkpoints/dialogpt-theraai/final --model dialogpt
```

---

## Step-by-Step Guide

### Step 1 — Download Datasets

```bash
python download_datasets.py [--data-dir ./data] [--hf-token YOUR_TOKEN]
```

- Downloads all 3 datasets to `data/raw/<dataset_name>/`
- Saves a `download_summary.json` with row counts
- `--hf-token` is optional (not required for these public datasets)
- To download only one dataset: `--dataset counsel_chat`

**Output:**
```
data/raw/
├── counsel_chat/           train.jsonl   (~700 rows)
├── empathetic_dialogues/   train/val/test.jsonl  (~25k rows)
└── mental_health_counseling/ train.jsonl (~3k rows)
```

---

### Step 2 — Preprocess

```bash
python preprocess.py [--data-dir ./data] [--output-dir ./data/processed]
```

**What it does:**
- Normalises all 3 datasets into unified `{instruction, input, output, source, emotion}` schema
- Filters out harmful content using regex patterns (dosage advice, abuse instructions, very short responses)
- Separates crisis examples (suicidal ideation, self-harm) into a `crisis_holdout.jsonl` — these are intentionally excluded from training to avoid teaching the model to reproduce crisis language
- Deduplicates by MD5 fingerprint of (input, output)
- Shuffles and splits: **80% train / 10% val / 10% test**

**Output:**
```
data/processed/
├── train.jsonl          (~12k–16k rows)
├── val.jsonl            (~1.5k–2k rows)
├── test.jsonl           (~1.5k–2k rows)
├── crisis_holdout.jsonl (crisis examples — review manually)
└── metadata.json        (counts, schema, source breakdown)
```

**Example row:**
```json
{
  "instruction": "You are TherapAI, a compassionate mental health support assistant...",
  "input": "[Topic: anxiety]\nI've been having panic attacks at work...",
  "output": "That sounds really difficult and exhausting. Panic attacks at work can feel especially overwhelming...",
  "source": "counsel_chat",
  "emotion": null
}
```

---

### Step 3 — Finetune

```bash
# Primary target — DialoGPT-medium (345 MB, causal LM, fastest)
python finetune.py --model dialogpt --data-dir ./data/processed --output-dir ./checkpoints

# Alternative — Flan-T5-large (780 MB, seq2seq, better at following instructions)
python finetune.py --model flan-t5 --data-dir ./data/processed --output-dir ./checkpoints

# Quick test run (100 samples, 1 epoch)
python finetune.py --model dialogpt --max-samples 100 --epochs 1
```

**LoRA Configuration:**

| Parameter | DialoGPT | Flan-T5 |
|-----------|----------|---------|
| `r` (rank) | 16 | 8 |
| `alpha` | 32 | 16 |
| `dropout` | 0.1 | 0.1 |
| `target_modules` | `c_attn`, `c_proj` | `q`, `v` |
| Trainable params | ~1.8M / 355M (~0.5%) | ~2.4M / 783M (~0.3%) |

**Checkpoints** saved every 500 steps to `checkpoints/<model>-theraai/checkpoint-*/`.
**Final adapter** saved to `checkpoints/<model>-theraai/final/` (only LoRA weights, ~20–50 MB).

**Training log example:**
```
08:23:15 | INFO     | Train: 12,430  |  Val: 1,554
08:23:16 | INFO     | Trainable parameters: 1,835,008 / 354,823,168 (0.52%)
08:45:12 | INFO     | {'loss': 2.3412, 'epoch': 0.5}
09:01:44 | INFO     | {'loss': 2.1089, 'epoch': 1.0}
09:18:03 | INFO     | {'eval_loss': 2.0543, 'epoch': 1.0}
```

---

### Step 4 — Evaluate

```bash
python evaluate.py --adapter-dir ./checkpoints/dialogpt-theraai/final --model dialogpt
```

**Metrics computed:**
- **BLEU-4** on held-out test split
- **ROUGE-L** on held-out test split
- **Theme coverage score** — keyword-based check for expected therapeutic themes per scenario
- **Side-by-side comparison** — base model vs finetuned for 12 curated scenarios

**Scenario categories tested:**

| Category | Count | Examples |
|----------|-------|---------|
| anxiety | 1 | Generalised anxiety, racing heart |
| depression | 1 | Low mood, anhedonia |
| stress | 1 | Exam / work pressure |
| relationships | 1 | Conflict, boundary issues |
| grief | 1 | Bereavement |
| loneliness | 1 | Social isolation |
| edge cases | 4 | Vague input, topic switch, medical question, hostile user |
| **crisis** | **2** | **Suicidal ideation, self-harm disclosure** |

> **Critical:** Crisis scenarios are marked with ⚠. Review these manually — the model
> MUST mention professional help and a hotline (Umang: 0317-4288665 for Pakistan).

---

### Step 5 — Integration into ModelService

See `integration_example.py` for full code. Two modes:

**Mode B (recommended) — Ollama primary, adapter as fallback:**
```python
# In model_service.py generate_response():
try:
    return await _call_ollama(user_message, history)   # Llama 3.1 8B
except OllamaUnavailableError:
    return await _generate_local_adapter(user_message)  # DialoGPT + LoRA
```

**Mode A — Local adapter only (fully offline):**
```python
# Replace model_service.py entirely with the Mode A version
# Load adapter at startup via threading.Thread in main.py lifespan
```

Set environment variable to point to adapter:
```bash
export THERAAI_ADAPTER_DIR=/path/to/checkpoints/dialogpt-theraai/final
```

---

## Hardware Requirements

| Environment | Training Time / Epoch | Notes |
|-------------|----------------------|-------|
| **RTX 3070 8GB** (recommended) | ~20–30 min | FP16, batch=4×4=16, full pipeline works |
| **RTX 5060 (sm_120)** | CPU fallback only | CUDA not supported by current PyTorch. Use Colab. |
| **Other NVIDIA GPU (8GB+)** | ~25–40 min | FP32, slightly slower |
| **CPU only (16GB RAM)** | ~8–16 hrs | Works but slow. Use `--max-samples 2000` for testing |
| **Google Colab T4 (free)** | ~10–15 min | Best free option. See Colab note below. |
| **Google Colab A100 (Pro)** | ~3–5 min | Ideal for full training run |

### Running on Google Colab (recommended for RTX 5060 users)

```python
# In a Colab notebook cell:
!git clone https://github.com/your-username/TheraAI-FYP-I
%cd TheraAI-FYP-I/backend/ml/finetuning

!pip install datasets transformers peft accelerate sentencepiece tqdm nltk rouge-score

!python download_datasets.py
!python preprocess.py
!python finetune.py --model dialogpt --epochs 3

# Download the adapter to your local machine:
from google.colab import files
import shutil
shutil.make_archive('dialogpt-theraai-adapter', 'zip', './checkpoints/dialogpt-theraai/final')
files.download('dialogpt-theraai-adapter.zip')
```

---

## Disk Space Requirements

| Item | Size |
|------|------|
| Raw datasets (all 3) | ~200–300 MB |
| Processed JSONL files | ~50–80 MB |
| DialoGPT-medium (base model cache) | ~345 MB |
| Flan-T5-large (base model cache) | ~780 MB |
| LoRA adapter (final) | **~20–50 MB** (only trained weights) |
| Intermediate checkpoints (3 kept) | ~60–150 MB |

**Total: ~800 MB – 1.5 GB** depending on which base model you use.

---

## Pip Dependencies

Install everything with:

```bash
pip install \
  datasets>=2.14.0 \
  transformers>=4.35.0 \
  peft>=0.6.0 \
  accelerate>=0.25.0 \
  sentencepiece>=0.1.99 \
  tqdm>=4.66.0 \
  nltk>=3.8.0 \
  rouge-score>=0.1.2 \
  torch>=2.5.0     # already in backend/requirements.txt
```

Or add these lines to `backend/requirements.txt`:
```
# Finetuning pipeline (ml/finetuning/)
peft>=0.6.0
rouge-score>=0.1.2
nltk>=3.8.0
```

---

## Troubleshooting

**`CUDA out of memory`**
- Reduce batch size: edit `per_device_batch = 2` in `finetune.py`
- Use gradient checkpointing: add `gradient_checkpointing=True` to `TrainingArguments`
- Use `--max-samples 1000` to train on a smaller slice first

**`RTX 5060 / sm_120` warning in finetune.py**
- Expected. PyTorch CUDA builds don't support sm_120 yet. Training runs on CPU.
- Recommended: use Google Colab T4 for training, then copy the adapter back.

**`Adapter not found` in ModelService**
- Set `THERAAI_ADAPTER_DIR` env var to the absolute path of `checkpoints/dialogpt-theraai/final/`
- Verify the directory contains `adapter_config.json` and `adapter_model.safetensors`

**`No module named 'peft'`**
- Run `pip install peft` in the backend virtual environment

**Evaluate shows low BLEU/ROUGE even after finetuning**
- DialoGPT generates diverse responses; BLEU/ROUGE penalise this. Focus on theme coverage score and qualitative comparison instead.
- ROUGE-L > 0.15 is reasonable for open-ended therapy dialogue.

---

## File Output Summary

After running the full pipeline:

```
data/processed/
├── train.jsonl          # Training examples
├── val.jsonl            # Validation examples
├── test.jsonl           # Test examples
├── crisis_holdout.jsonl # Manually review before using
└── metadata.json        # Statistics

checkpoints/dialogpt-theraai/
├── checkpoint-500/      # Step 500 checkpoint
├── checkpoint-1000/     # Step 1000 checkpoint
├── checkpoint-1500/     # Step 1500 checkpoint
├── final/               # Best model (smallest to deploy)
│   ├── adapter_config.json
│   ├── adapter_model.safetensors
│   └── tokenizer files
└── training_config.json # Hyperparameters + loss

evaluation_results.json  # Metrics + all scenario responses
```
