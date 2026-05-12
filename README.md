<div align="center">

# TheraAI

### AI-Powered Mental Health Platform

*Intelligent support for patients. Deep insight for therapists. Full visibility for administrators.*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

**[Live Demo](https://theraai.vercel.app)** · **[API Docs](https://theraai-backend.onrender.com/docs)** · **[Report Issue](https://github.com/dawoodqamar/TheraAI-FYP-I/issues)**

</div>

---

## What is TheraAI?

TheraAI is a production-deployed, full-stack mental health platform — built as a Final Year Project in Computer Science. It connects patients with licensed psychiatrists through a unified platform that uses AI at every layer to make care more effective.

**For patients:** An always-available AI wellness companion (Thera), evidence-based self-assessment tools, mood and journal tracking with AI sentiment analysis, appointment booking, and video calls with their therapist.

**For psychiatrists:** AI-generated pre-session patient briefings, real-time crisis alerts, structured session notes, treatment plans, and a full view of each patient's mental health timeline.

**For administrators:** A live analytics dashboard with platform-wide statistics, user management, and a crisis event audit log.

This is not a mockup or a prototype. TheraAI is deployed and live, with JWT authentication, WebSocket real-time chat, role-based access control, 30+ REST endpoints, multi-model AI inference, and a gamification system — all running on production infrastructure.

---

## Features

### Patient Portal

| Feature | Description |
|---------|-------------|
| **AI Companion Chat** | Real-time conversation with Thera — an empathetic AI wellness companion powered by Llama 3.1 8B. Handles depression, anxiety, stress, burnout, grief, and crisis detection with evidence-based responses and escalation to real helplines. |
| **Smart Journaling** | Write entries and receive instant AI analysis: binary sentiment (DistilBERT) + 28-category emotion detection (RoBERTa GoEmotions). Historical trend view across all entries. |
| **Mood Tracking** | Daily mood logging with 5-point scale, notes, and interactive charts showing weekly and monthly patterns. |
| **Clinical Assessments** | Standardized tools auto-scored in real time: PHQ-9 (depression), GAD-7 (anxiety), PSS-10 (stress), WHO-5 (wellbeing), PCL-5 (PTSD), DASS-21, AUDIT-C, and Wellness Check. Full submission history retained. |
| **Appointment Booking** | Browse verified psychiatrist profiles with specializations, view real-time availability slots, and confirm sessions. |
| **Video Calls** | Integrated Jitsi Meet video calling — launches directly in the browser, no app download required. |
| **Achievements & Streaks** | Gamification layer that rewards journaling consistency, assessment completion, and healthy habits — increasing long-term engagement. |
| **Weekly Summaries** | AI-generated weekly summaries of mood, sentiment, and activity patterns delivered to the patient dashboard. |

### Therapist Portal

| Feature | Description |
|---------|-------------|
| **AI Pre-Session Briefings** | Before each appointment, therapists receive an AI-generated summary of the patient's recent mood trends, journal sentiment, latest assessment scores, and any flagged crisis events — so every session starts informed. |
| **Patient Timeline** | Full history per patient: mood chart, journal entries with sentiment scores, all assessment results, session notes, and treatment plan. |
| **Crisis Alerts** | Real-time notifications when the AI detects crisis-level content in a patient's chat. Immediate escalation to verified Pakistan and global helplines. |
| **Session Notes** | Structured session documentation linked to individual appointments. |
| **Treatment Plans** | Create and update patient treatment plans directly in the platform. |
| **Availability Management** | Set recurring availability slots; patients see and book open times. |

### Admin Panel

| Feature | Description |
|---------|-------------|
| **Analytics Dashboard** | Platform-wide live statistics: total users, active patients, appointments this week, crisis events this month, and growth over time — sourced from real MongoDB aggregation queries. |
| **User Management** | View all patient and therapist accounts, activate or deactivate accounts, and remove users. |
| **Crisis Event Log** | Full audit history of every crisis interaction across all patients for platform safety monitoring. |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│                                                                      │
│   React 18 + Vite 7 · Tailwind CSS · React Router v6 · Recharts     │
│   Axios (with JWT interceptors) · Lucide Icons                       │
│   Deployed: Vercel (global CDN, edge network)                        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  HTTPS  /  WSS (WebSocket)
┌────────────────────────────▼─────────────────────────────────────────┐
│                           API LAYER                                  │
│                                                                      │
│   FastAPI (Python 3.11) · Uvicorn ASGI server                        │
│   JWT authentication · Role-Based Access Control (patient /          │
│   psychiatrist / admin) · SlowAPI rate limiting                      │
│   30+ REST endpoints · WebSocket endpoint (/ws/chat)                 │
│   Deployed: Render (Python native runtime)                           │
└────────────┬────────────────────────────────────┬────────────────────┘
             │                                    │
┌────────────▼──────────────┐      ┌─────────────▼──────────────────────┐
│        DATABASE           │      │            AI LAYER                │
│                           │      │                                    │
│   MongoDB Atlas           │      │  Llama 3.1 8B (cloud inference)    │
│   Motor async driver      │      │  ├─ Therapeutic chat responses     │
│   9 collections           │      │  └─ Pre-session patient briefings  │
│   Indexed aggregations    │      │                                    │
│   Cloud-hosted (M0)       │      │  DistilBERT SST-2 (268 MB)        │
│                           │      │  └─ Journal sentiment analysis     │
└───────────────────────────┘      │                                    │
                                   │  RoBERTa GoEmotions (499 MB)       │
                                   │  └─ 28-class emotion detection     │
                                   └────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| FastAPI | 0.115 | Async REST API and WebSocket framework |
| Python | 3.11 | Runtime |
| Motor | 3.3 | Async MongoDB driver |
| Pydantic v2 | 2.7 | Data validation, serialization, and settings management |
| python-jose | 3.3 | JWT generation and verification |
| Passlib + bcrypt | 1.7 | Password hashing |
| APScheduler | 3.10 | Background appointment reminder scheduling |
| SlowAPI | 0.1.9 | Per-endpoint rate limiting |
| httpx | 0.27 | Async HTTP client (AI API calls) |
| fastapi-mail | 1.4 | Async SMTP email for appointment confirmations |

### AI & Machine Learning

| Model | Size | Task |
|-------|------|------|
| Llama 3.1 8B | 8 billion params | Conversational AI companion, pre-session briefings |
| DistilBERT (SST-2 fine-tuned) | 268 MB | Binary sentiment analysis on journal entries |
| RoBERTa GoEmotions | 499 MB | 28-class emotion detection on journal entries |

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| React | 18 | UI component framework |
| Vite | 7 | Build tool and dev server |
| Tailwind CSS | 3 | Utility-first styling system |
| React Router | v6 | Client-side routing with protected routes |
| Axios | — | HTTP client with request/response interceptors |
| Recharts | — | Mood and analytics data visualization |
| Lucide React | — | Icon system |

### Infrastructure

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Cloud-hosted MongoDB (M0 cluster) |
| Render | Backend hosting — Python native runtime, no Docker overhead |
| Vercel | Frontend hosting — global CDN, automatic HTTPS |
| Jitsi Meet | WebRTC video calling (self-hostable, no API key needed) |

---

## Getting Started (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB running locally, **or** a MongoDB Atlas connection string

### 1. Clone the repo

```bash
git clone https://github.com/dawoodqamar/TheraAI-FYP-I.git
cd TheraAI-FYP-I
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS / Linux

# Install all dependencies (includes PyTorch for local AI models)
pip install -r requirements.txt

# Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
# Required: SECRET_KEY, MONGODB_URL, GROQ_API_KEY

# Seed the database
python -m scripts.seed_all

# Start the development server
uvicorn app.main:app --reload --port 8000
```

- REST API: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd web
npm install

# Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
# Set: VITE_API_URL=http://localhost:8000

npm run dev
```

Frontend: `http://localhost:3000`

### 4. Demo Accounts

After running `seed_all`, the following accounts are ready:

| Email | Password | Role |
|-------|----------|------|
| `patient@test.com` | `Test@1234` | Patient |
| `dr.ayesha.khan@theraai.com` | `TheraAI@2024!` | Psychiatrist |
| `dr.usman.sheikh@theraai.com` | `TheraAI@2024!` | Psychiatrist |
| `dr.sana.mirza@theraai.com` | `TheraAI@2024!` | Psychiatrist |
| `dr.bilal.chaudhry@theraai.com` | `TheraAI@2024!` | Psychiatrist |
| `admin@theraai.com` | `Admin@2024!` | Admin |

---

## API Reference

Base URL: `/api/v1`

| Category | Key Endpoints |
|----------|--------------|
| **Authentication** | `POST /auth/signup` · `POST /auth/login` · `GET /auth/me` · `PUT /auth/me` · `POST /auth/change-password` |
| **Chat** | `POST /chat/message` · `GET /chat/history` · `DELETE /chat/history` · `WS /ws/chat` |
| **Journals** | `GET/POST /journals` · `GET/PUT/DELETE /journals/{id}` · `GET /journals/stats` |
| **Moods** | `GET/POST /moods` · `GET /moods/stats` |
| **Assessments** | `GET /assessments` · `GET /assessments/{slug}` · `POST /assessments/{slug}/submit` · `GET /assessments/history` |
| **Appointments** | `GET/POST /appointments` · `POST /appointments/{id}/cancel` |
| **Therapists** | `GET /therapists` · `GET /therapists/{id}` · `GET /therapists/{id}/slots` |
| **Therapist Panel** | `GET /therapist/dashboard` · `GET /therapist/patients` · `GET /therapist/patients/{id}/briefing` · `GET /therapist/alerts` |
| **User Stats** | `GET /users/me/stats` · `GET /users/me/achievements` · `GET /users/me/activity` · `GET /users/me/weekly-summary` |
| **Admin** | `GET /admin/dashboard` · `GET /admin/users` · `PATCH /admin/users/{id}` · `GET /admin/crisis-events` |
| **Settings** | `GET/PUT /settings` · `DELETE /settings/account` |

---

## Project Structure

```
TheraAI-FYP-I/
│
├── backend/
│   ├── app/
│   │   ├── api/                  # 18 route modules
│   │   │   ├── auth.py           # Signup, login, JWT, profile
│   │   │   ├── chat.py           # REST chat endpoint
│   │   │   ├── ws.py             # WebSocket real-time chat
│   │   │   ├── journals.py       # CRUD + AI analysis trigger
│   │   │   ├── moods.py          # Mood logging and stats
│   │   │   ├── assessments.py    # Assessment engine and scoring
│   │   │   ├── appointments.py   # Booking and cancellation
│   │   │   ├── therapist.py      # Therapist-only routes
│   │   │   ├── admin.py          # Admin dashboard routes
│   │   │   ├── stats.py          # Patient stats and achievements
│   │   │   └── ...               # settings, escalations, sessions, etc.
│   │   │
│   │   ├── models/               # Pydantic v2 document models
│   │   ├── services/             # Business logic — all DB ops here
│   │   │   ├── model_service.py  # Llama 3.1 8B chat integration
│   │   │   ├── ai_service.py     # DistilBERT + RoBERTa journal analysis
│   │   │   ├── journal_service.py
│   │   │   ├── appointments_service.py
│   │   │   └── ...
│   │   ├── dependencies/
│   │   │   ├── auth.py           # JWT token validation
│   │   │   ├── rbac.py           # require_patient / require_therapist / require_admin
│   │   │   └── rate_limit.py     # SlowAPI limiter
│   │   ├── config.py             # Pydantic settings — all env vars typed
│   │   ├── database.py           # Motor async connection manager
│   │   └── main.py               # FastAPI app, CORS, lifespan
│   │
│   ├── scripts/
│   │   └── seed_all.py           # Full database seeder (accounts, assessments, activity)
│   ├── requirements.txt          # Full deps (PyTorch + HuggingFace for local GPU)
│   └── requirements.prod.txt     # Slim deps for cloud deployment (no PyTorch)
│
├── web/
│   ├── src/
│   │   ├── pages/                # 15 page components
│   │   │   ├── Dashboard/        # Patient home with stats + charts
│   │   │   ├── Chat/             # Real-time AI chat interface
│   │   │   ├── Journal/          # Journal editor + history
│   │   │   ├── MoodTracker/      # Mood log + trend visualization
│   │   │   ├── Assessments/      # Assessment flow + history
│   │   │   ├── Appointments/     # Booking UI
│   │   │   ├── Therapist/        # Therapist portal (dashboard, patients, briefings)
│   │   │   └── ...
│   │   ├── components/           # Shared and feature-specific components
│   │   │   ├── ui/               # Design system (buttons, cards, modals)
│   │   │   └── ...
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx   # Global auth state + role detection
│   │   │   └── ToastContext.jsx  # Notification system
│   │   ├── App.jsx               # Routes + protected route guards
│   │   └── apiClient.js          # Axios instance with JWT interceptors
│   └── vercel.json               # SPA routing config for Vercel
│
├── render.yaml                   # Render deployment service definition
└── DEPLOY.md                     # Full deployment guide with step-by-step instructions
```

---

## Notable Engineering Decisions

**Async-first backend** — Motor (async MongoDB driver) combined with FastAPI's native `async`/`await` means zero thread-pool blocking. Every database query, HTTP request, and AI call is fully non-blocking, supporting high concurrency without extra worker processes.

**Strict service layer** — API routers contain zero business logic or database calls. All operations go through typed service classes (`JournalService`, `ModelService`, `AppointmentsService`). This separation makes each layer independently testable and the codebase straightforward to extend.

**Layered RBAC** — Role-based access is enforced at the dependency level via `require_patient`, `require_therapist`, and `require_admin` functions injected into route signatures — not scattered through handler code. Adding a new protected route is a single decorator.

**Lazy AI model loading** — DistilBERT and RoBERTa do not load at server startup. They initialize on the first journal analysis request. This keeps cold-start time under 3 seconds on any machine, including low-memory cloud instances.

**Dual requirements files** — `requirements.txt` pulls PyTorch (~2.5 GB with CUDA) and HuggingFace Transformers for full local GPU inference. `requirements.prod.txt` removes all ML dependencies entirely (~50 MB total install) and delegates LLM inference to a cloud API — making Docker builds fast and cloud deploys cost-efficient.

**Crisis detection as a first-class concern** — Every chat message passes through keyword-based crisis detection before reaching the AI model. Detected crisis signals immediately return verified helpline information (Umang Pakistan, Crisis Text Line, Befrienders Worldwide) and flag an event for therapist review — the AI is never the sole intervention point.

**Pydantic v2 settings** — All configuration lives in a single `config.py` with typed `Settings` fields for every environment variable. No raw `os.getenv()` calls scattered through service code. Every value has a type, a default, and a documented alias.

---

## Deployment

TheraAI is fully deployed and accessible:

| Layer | Platform | URL |
|-------|----------|-----|
| Frontend | Vercel | [theraai.vercel.app](https://theraai.vercel.app) |
| Backend API | Render | [theraai-backend.onrender.com](https://theraai-backend.onrender.com) |
| Database | MongoDB Atlas | M0 cluster (cloud-hosted) |

See [DEPLOY.md](./DEPLOY.md) for the complete step-by-step deployment guide.

---

## Author

**Dawood Qamar**
Final Year Project · BS Computer Science

---

<div align="center">

Built with FastAPI · React 18 · MongoDB · Llama 3.1 8B · DistilBERT · RoBERTa GoEmotions

</div>
