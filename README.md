# TheraAI — AI-Powered Mental Health Companion

> An FYP (Final Year Project) capstone application that combines AI-driven journaling, a wellness chatbot, mood tracking, and a therapist portal.

**Tech Stack:** FastAPI + React 18 + MongoDB + Ollama (Llama 3.1 8B) + HuggingFace Transformers

---

## Features

- **AI Chat Companion** — Wellness chatbot powered by Llama 3.1 8B via Ollama, with CBT/DBT-informed responses
- **Smart Journal** — Journal entries auto-analyzed by DistilBERT (sentiment) and RoBERTa (28 emotions)
- **Mood Tracker** — Track daily moods with Recharts visualizations
- **Gamification** — Streak tracking, XP, levels, and 12 achievement milestones
- **Role-Based Access** — Patient, Psychiatrist, and Admin portals
- **Secure Auth** — JWT (HS256) + bcrypt, token refresh, rate limiting

---

## Quick Start (Local Dev)

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 7 (local or Docker)
- [Ollama](https://ollama.ai/) — for the AI chat feature

### 1. Clone and configure

```bash
git clone <repo-url>
cd TheraAI-FYP-I

# Copy env example and fill in your values
cp .env.example backend/.env
cp .env.example web/.env   # Edit VITE_* variables
```

### 2. Pull the AI model (required for chat)

```bash
ollama pull llama3.1:8b
```

> **RTX 5060 / sm_120 users:** Ollama uses the GPU natively. The HuggingFace models (DistilBERT, RoBERTa) fall back to CPU automatically.

### 3. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Linux/Mac
venv\Scripts\activate       # Windows

pip install -r requirements.txt

uvicorn app.main:app --reload
# API available at: http://localhost:8000
# Docs (debug mode): http://localhost:8000/docs
```

### 4. Start the frontend

```bash
cd web
npm install
npm run dev
# App available at: http://localhost:3000
```

---

## Docker (All Services)

```bash
# Start all 4 containers: mongodb, redis, backend, frontend
docker-compose up --build

# Stop
docker-compose down

# View backend logs
docker-compose logs -f backend
```

Services:
- **MongoDB** → `localhost:27017`
- **Redis** → `localhost:6379`
- **Backend API** → `http://localhost:8000`
- **Frontend** → `http://localhost:3000`

---

## Environment Variables

See [`.env.example`](.env.example) for all required and optional environment variables with descriptions.

**Required:**
- `SECRET_KEY` — JWT signing key (generate: `openssl rand -hex 32`)
- `MONGODB_URL` — MongoDB connection string
- `MONGODB_DATABASE` — Database name

---

## Project Structure

```
TheraAI-FYP-I/
├── .env.example              # Environment variable template
├── docker-compose.yml        # Docker orchestration (4 services)
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + lifespan
│   │   ├── config.py         # Settings (Pydantic v2)
│   │   ├── database.py       # Motor async MongoDB
│   │   ├── api/              # Routers: auth, journals, chat, moods, stats, conversations
│   │   ├── models/           # Pydantic schemas
│   │   ├── services/         # Business logic layer
│   │   ├── dependencies/     # Auth guards, rate limiting
│   │   └── utils/            # Auth utils (JWT, bcrypt)
│   ├── ml/
│   │   └── finetuning/       # LoRA finetuning pipeline (optional)
│   ├── tests/                # pytest test suite
│   └── requirements.txt
└── web/
    └── src/
        ├── App.jsx            # React Router setup
        ├── pages/             # Route components
        ├── components/        # Reusable UI components
        ├── services/          # API service layer
        ├── contexts/          # AuthContext, ToastContext
        └── lib/utils.js       # cn() class helper
```

---

## API Overview

Base URL: `http://localhost:8000/api/v1`

| Group | Prefix | Endpoints |
|-------|--------|-----------|
| Auth | `/auth` | signup, login, me, refresh, logout |
| Journals | `/journals` | CRUD + AI analysis + stats |
| Chat | `/chat` | message, history, clear |
| Moods | `/moods` | CRUD + stats |
| Stats | `/users` | stats, achievements, activity |
| Conversations | `/conversations` | CRUD + messages |

Full documentation: [`CLAUDE.md`](CLAUDE.md) or `http://localhost:8000/docs` (debug mode)

---

## Running Tests

```bash
# Backend
cd backend
pytest tests/ --cov=app --cov-report=term-missing

# Frontend
cd web
npm test -- --run
```

CI/CD runs automatically via GitHub Actions on every push (`.github/workflows/test.yml`).

---

## AI Model Finetuning (Optional)

A LoRA finetuning pipeline for DialoGPT-medium is available at `backend/ml/finetuning/`.

```bash
cd backend/ml/finetuning

python download_datasets.py   # Download therapy datasets
python preprocess.py          # Normalize + filter
python finetune.py --model dialogpt --epochs 3
python evaluate.py --adapter-dir ./checkpoints/dialogpt-theraai/final
```

See [`backend/ml/finetuning/README.md`](backend/ml/finetuning/README.md) for hardware requirements and Colab instructions.

---

## Completion Status

| Feature | Status |
|---------|--------|
| Authentication (JWT + roles) | ✅ Complete |
| Patient Dashboard | ✅ Complete |
| Journal + AI Analysis | ✅ Complete |
| AI Chat (Ollama/Llama 3.1) | ✅ Complete |
| Mood Tracker | ✅ Complete |
| Gamification (XP, streaks, achievements) | ✅ Complete |
| Profile Page | 🔧 Partial (change-password stub) |
| Psychiatrist Dashboard | ❌ Not started |
| Admin Dashboard | ❌ Not started |
| Appointments / Scheduling | ❌ No backend |
| Teletherapy (Video) | ❌ Not connected |
