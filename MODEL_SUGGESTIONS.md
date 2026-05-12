# AI Model Suggestions for TheraAI

> Reference doc for replacing/upgrading models before deployment and mobile migration.

---

## 1. Replace Ollama / Llama 3.1 8B (Chat AI)

Currently the chat runs Llama 3.1 8B locally via Ollama. This is ~4.7 GB and requires a GPU/heavy CPU — not viable for cloud deployment or mobile.

### Options

| Model | Provider | Cost | Speed | Notes |
|-------|----------|------|-------|-------|
| **Groq + Llama 3.1 8B** | Groq Cloud | Free tier | ⚡ 300+ tok/s | Keeps the exact same Llama model, just removes Ollama. Easiest migration — change base URL + API key only. |
| **Gemini 2.0 Flash** | Google AI | Free tier generous | ⚡ Very fast | Best all-round free option. Great at empathetic dialogue. `google-generativeai` SDK. |
| **Claude Haiku 4.5** | Anthropic | ~$0.25/M tokens | ⚡ Fast | Cheapest high-quality option. Use prompt caching on system prompt to cut costs ~80%. |
| **GPT-4o mini** | OpenAI | ~$0.15/M tokens | Fast | Solid fallback. Widely trusted, good at sensitive topics. |
| **Mistral 7B (via Mistral API)** | Mistral | Free tier | Fast | European hosting — good for data-residency concerns. |

### Recommendation

- **Fastest migration (keep Llama):** Switch to **Groq** — free, same model, just swap `OLLAMA_BASE_URL` for `GROQ_API_KEY`. No code logic changes needed.
- **Best for production + mobile:** **Gemini 2.0 Flash** — generous free tier, fast, great at emotional/mental health context.
- **Best quality per cost:** **Claude Haiku 4.5** with prompt caching.

### Migration effort for Groq

```python
# In model_service.py — change base URL and add API key
# pip install groq
from groq import Groq
client = Groq(api_key=os.environ["GROQ_API_KEY"])
```

---

## 2. NLP Models (Sentiment + Emotion Detection)

Currently running two local models:
- `distilbert-base-uncased-finetuned-sst-2-english` — sentiment (~260 MB)
- `SamLowe/roberta-base-go_emotions` — 28-emotion classifier (~500 MB)

Total ~760 MB of model RAM on the backend server.

### Option A — Keep local, use smaller variants

| Current Model | Replacement | Size | Notes |
|---------------|-------------|------|-------|
| DistilBERT SST-2 | `cardiffnlp/twitter-roberta-base-sentiment-latest` | ~120 MB | Trained on social/emotional text — better fit for journal entries. |
| RoBERTa GoEmotions (28) | `bhadresh-savani/bert-base-uncased-emotion` | ~420 MB | 6 emotions (sadness, joy, anger, fear, love, surprise). Simpler but faster and good enough. |

### Option B — Move to Hugging Face Inference API (best for deployment)

Call both models remotely instead of loading them in memory.

```python
import requests

HF_API_URL = "https://api-inference.huggingface.co/models/SamLowe/roberta-base-go_emotions"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}
response = requests.post(HF_API_URL, json={"inputs": text}, headers=headers)
```

- Free tier available
- Zero local RAM usage
- Works identically to current code
- Perfect for a cloud-deployed backend

### Option C — Add dedicated mental health models

| Feature | Model | Where to use |
|---------|-------|-------------|
| Suicide/self-harm risk scoring | `mental/mental-roberta-base` or `goarguable/mental-bert-uncased` | Replace keyword-based crisis detection with a proper classifier — much more accurate |
| Zero-shot topic detection | `facebook/bart-large-mnli` | Detect themes like "relationship issues", "work stress", "grief" without retraining |
| Journal summarization | `sshleifer/distilbart-cnn-12-6` | Auto-generate 2-sentence summary of journal entries for therapist pre-session briefing |
| Therapeutic response generation | `mental/mental-alpaca` | Fine-tuned on counseling conversations — better empathy responses than general LLMs |

---

## 3. Mobile Considerations

When converting to React Native / mobile app:

- **All NLP/AI must be API calls** — no local models on device
- Chat AI: Any of the cloud options above work (just HTTP calls)
- NLP: Move to HuggingFace Inference API or a dedicated `/analyze` backend endpoint
- Crisis detection: Keep on backend — never client-side
- Consider **streaming responses** for chat (better UX on mobile) — Groq, Gemini, Claude all support SSE streaming

---

## 4. Decision Matrix

| Priority | Pick |
|----------|------|
| Easiest migration, keep Llama | Groq |
| Best free option long-term | Gemini 2.0 Flash |
| Best quality + caching | Claude Haiku 4.5 |
| Most accurate crisis detection | `mental/mental-roberta-base` (HuggingFace) |
| Reduce backend RAM fast | HuggingFace Inference API for NLP models |

---

*Created: 2026-04-21*
