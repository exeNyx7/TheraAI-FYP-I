# TheraAI — Claude Code Reference

> AI-powered mental health therapy chatbot platform. Final Year Project (FYP).
> Full-stack web app: FastAPI backend + React frontend + MongoDB + local HuggingFace ML inference.

---

## 1. Project Overview

**TheraAI** is a mental health support platform that combines AI-driven journaling (sentiment + emotion analysis), a wellness chatbot, mood tracking, and a therapist portal. Target users are patients seeking mental health support, psychiatrists managing patients, and admins.

- **Type:** Final Year Project (university capstone)
- **Status:** Core features complete; psychiatrist/admin dashboards and several pages still pending
- **AI stack:** 2 local HuggingFace transformer models (DistilBERT + RoBERTa) + Ollama/Llama 3.1 8B for chat

---

## 2. Tech Stack

| Layer | Technology | Version / Details |
|-------|-----------|-------------------|
| **Backend** | FastAPI + Python | Python 3.11, Pydantic v2, uvicorn |
| **Async DB driver** | Motor | MongoDB async (Motor 3.6+) |
| **Database** | MongoDB | 7.0, 6 collections |
| **Cache** | Redis | 7 Alpine (session/rate-limit support) |
| **AI/ML** | PyTorch + HuggingFace Transformers | CUDA 12.1 index, GPU-adaptive |
| **Auth** | JWT (HS256) + bcrypt | Access token 30 min, refresh 7 days |
| **Frontend** | React 18 + Vite 7 | React Router 7, Tailwind CSS 3.4 |
| **UI components** | Radix UI + shadcn/ui style | 15+ primitives, Lucide icons |
| **Charts** | Recharts 3.5 | Line, Pie charts |
| **HTTP client** | Axios 1.13 | With interceptors for auth |
| **DevOps** | Docker Compose | 4 containers: mongodb, redis, backend, frontend |

---

## 3. Folder Structure

```
TheraAI-FYP-I/
├── CLAUDE.md                        # This file
├── docker-compose.yml               # 4-service orchestration
├── project_reference.md             # Architecture quick reference
├── docs/
│   ├── ENVIRONMENT.md               # Env var setup guide
│   ├── AI_INSIGHTS_FIX_DEC11.md     # Journal AI @computed_field fix log
│   └── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # FastAPI app, lifespan, router registration
│   │   ├── config.py                # Pydantic Settings (all env vars with defaults)
│   │   ├── database.py              # Motor async MongoDB manager + index setup
│   │   ├── api/
│   │   │   ├── __init__.py          # Re-exports all routers
│   │   │   ├── auth.py              # /auth — signup, login, me, JWT refresh
│   │   │   ├── journal.py           # /journals — CRUD + stats
│   │   │   ├── chat.py              # /chat — Ollama/Llama 3.1 8B chat (BlenderBot replaced)
│   │   │   ├── moods.py             # /moods — standalone mood entries
│   │   │   ├── stats.py             # /users — stats, achievements, activity
│   │   │   └── conversations.py     # /conversations — chat session management
│   │   ├── models/
│   │   │   ├── user.py              # User, Token, TokenData (189 lines)
│   │   │   ├── journal.py           # Journal + AIAnalysisResult schemas (382 lines)
│   │   │   ├── mood.py              # Mood schemas
│   │   │   └── conversation.py      # Conversation + Message schemas
│   │   ├── services/
│   │   │   ├── ai_service.py        # Singleton — DistilBERT + RoBERTa (BlenderBot commented out)
│   │   │   ├── model_service.py     # ModelService — Ollama/Llama 3.1 8B chat + fallback
│   │   │   ├── user_service.py      # UserService
│   │   │   ├── journal_service.py   # JournalService
│   │   │   ├── mood_service.py      # MoodService
│   │   │   └── conversation_service.py
│   │   ├── dependencies/
│   │   │   ├── auth.py              # get_current_user, require_role, TTLCache
│   │   │   └── rate_limit.py        # SlowAPI limiter
│   │   └── utils/
│   │       └── auth.py              # hash_password, verify_password, JWT helpers
│   └── tests/
│       ├── test_auth.py
│       ├── test_journal.py
│       ├── test_ai_service.py
│       └── test_chatbot_conversations.py
├── web/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                  # Router setup (14+ routes)
│       ├── main.jsx                 # Entry point
│       ├── pages/
│       │   ├── Auth/                # LoginV0.jsx, SignupV0.jsx
│       │   ├── Dashboard/           # DashboardV0 (routes to patient/psychiatrist/admin)
│       │   ├── Chat/                # Chat.jsx — AI wellness companion
│       │   ├── Journal/             # Journal.jsx, JournalDetailV0.jsx
│       │   ├── MoodTracker/         # MoodTracker.jsx — Recharts visualizations
│       │   ├── Profile/             # Profile.jsx
│       │   ├── Settings/            # Settings.jsx
│       │   ├── Appointments/        # Appointments.jsx (no backend yet)
│       │   ├── Assessments/         # Assessments.jsx (no backend yet)
│       │   ├── Achievements/        # Achievements.jsx
│       │   ├── Therapist/           # TherapistDashboard.jsx
│       │   └── Landing/             # LandingPageV0.jsx
│       ├── components/
│       │   ├── ui/                  # shadcn-style: button, card, input, dialog, etc.
│       │   ├── Chat/                # MessageBubble, SessionHistory, VoiceInput
│       │   ├── Journal/             # JournalCard, JournalForm, AddJournalModal, MoodSelector
│       │   ├── Dashboard/           # DashboardHeader, SidebarNav, ActivityHeatmap, QuickActions
│       │   ├── Landing/             # HeroSection, FeaturesGrid, ValueProposition, CTASection
│       │   ├── Auth/                # Login, Signup (plus legacy _OLD and _NEW variants)
│       │   ├── Navigation/          # Navbar, Footer
│       │   ├── Appointments/        # TherapistSelector, PaymentCheckout
│       │   ├── Teletherapy/         # VideoCallModal (not connected)
│       │   └── Gamification/        # AchievementTracker
│       ├── services/
│       │   ├── apiClient.js         # Axios instance + auth interceptors
│       │   ├── authService.js       # login, signup, getProfile, token management
│       │   ├── chatService.js       # sendMessage, getHistory, conversation CRUD
│       │   ├── journalService.js    # Journal CRUD + stats
│       │   ├── moodService.js       # Mood CRUD + stats
│       │   └── statsService.js      # getUserStats, getAchievements, getActivityFeed
│       ├── contexts/
│       │   ├── AuthContext.jsx      # JWT token state, login/logout/signup actions
│       │   └── ToastContext.jsx     # Global toast notification system
│       └── lib/
│           └── utils.js             # cn() helper (clsx + tailwind-merge)
└── .claude/
    └── skills/
        └── fastapi-patterns.md      # Backend coding patterns skill
```

---

## 4. All API Routes

Base prefix: `/api/v1`

### Auth — `/api/v1/auth`
| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| POST | `/auth/signup` | No | 5/min | Register new user |
| POST | `/auth/login` | No | 10/min | Login, returns JWT |
| GET | `/auth/me` | Yes | — | Get current user profile |
| PUT | `/auth/me` | Yes | — | Update user profile |
| POST | `/auth/change-password` | Yes | — | Change password (**stub — not implemented**) |
| POST | `/auth/refresh` | Yes | — | Refresh access token |
| POST | `/auth/logout` | Yes | — | Logout |
| GET | `/auth/health` | No | — | Auth router health check |

### Journals — `/api/v1/journals`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/journals` | Yes | Create entry — auto-runs AI analysis |
| GET | `/journals` | Yes | List entries (skip, limit query params) |
| GET | `/journals/stats` | Yes | Mood + sentiment statistics |
| GET | `/journals/{id}` | Yes | Get single entry |
| PUT | `/journals/{id}` | Yes | Update entry (re-runs AI if content changed) |
| DELETE | `/journals/{id}` | Yes | Delete entry (204) |

### Chat — `/api/v1/chat`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/message` | Yes | Send message to AI companion (Llama 3.1 8B via Ollama) |
| GET | `/chat/history` | Yes | Get recent chat history (limit=10) |
| DELETE | `/chat/history` | Yes | Clear all user chat history |

### Moods — `/api/v1/moods`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/moods` | Yes | Create standalone mood entry |
| GET | `/moods` | Yes | List mood history (limit 1-100) |
| GET | `/moods/stats` | Yes | Stats by period (7d/30d/90d/all) |
| GET | `/moods/{id}` | Yes | Get single mood entry |
| PUT | `/moods/{id}` | Yes | Update mood entry |
| DELETE | `/moods/{id}` | Yes | Delete mood entry (204) |

### Stats — `/api/v1/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me/stats` | Yes | Streaks, XP, level, mood average, weekly progress |
| GET | `/users/me/achievements` | Yes | 12 achievement milestones |
| GET | `/users/me/activity` | Yes | Recent activity feed |

### Conversations — `/api/v1/conversations`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/conversations` | Yes | Create new chat conversation |
| GET | `/conversations` | Yes | List conversations (limit 50) |
| GET | `/conversations/{id}` | Yes | Get conversation metadata |
| GET | `/conversations/{id}/messages` | Yes | Get messages (limit 100) |
| PUT | `/conversations/{id}` | Yes | Rename conversation |
| DELETE | `/conversations/{id}` | Yes | Delete conversation + all messages (204) |

### Root / Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | App info |
| GET | `/health` | Full health check (DB status, features) |
| GET | `/api/v1` | API v1 info |

---

## 5. AI Model Integrations

Two HuggingFace models loaded as a singleton (`services/ai_service.py`) at startup via a background thread. Chat LLM is handled separately by `services/model_service.py` via Ollama HTTP API.

### Model 1 — DistilBERT Sentiment
- **Model ID:** `distilbert-base-uncased-finetuned-sst-2-english`
- **Size:** ~268 MB
- **Purpose:** Binary sentiment (POSITIVE / NEGATIVE)
- **Used in:** `ai_service.analyze_sentiment()` → called by `ai_service.analyze_text()` → called by `JournalService.create_entry()` and `JournalService.update_entry()`

### Model 2 — RoBERTa GoEmotions
- **Model ID:** `SamLowe/roberta-base-go_emotions`
- **Size:** ~499 MB
- **Purpose:** 28-category multi-label emotion detection (returns top 5 above 10% confidence)
- **Used in:** `ai_service.analyze_emotions()` → called by `ai_service.analyze_text()` → same journal flow as above
- **Emotion themes mapped:** Joy, Sadness, Fear, Anger, Surprise, Neutral

### Model 3 — Ollama / Llama 3.1 8B ✅ ACTIVE (replaced BlenderBot)
- **Model ID:** `llama3.1:8b` (served by local Ollama at `http://localhost:11434`)
- **Purpose:** Conversational chat responses for the wellness companion
- **Used in:** `services/model_service.py → ModelService.generate_response()` → called by `api/chat.py`
- **Status: ACTIVE** — async HTTP calls via `httpx`; no GPU memory needed (Ollama manages its own inference). Falls back to keyword-based responses if Ollama is not running.
- **System prompt:** Detailed therapist persona covering CBT/DBT, crisis detection, Pakistan cultural context, and hotline info (Umang: 0317-4288665). See `model_service.py:THERAPIST_SYSTEM_PROMPT`.
- **~~BlenderBot (DEPRECATED)~~** — `facebook/blenderbot-400M-distill` code commented out in `ai_service.py`. RTX 5060 (sm_120) was incompatible.

### GPU Detection (DistilBERT + RoBERTa only — Ollama self-manages GPU)
The AI service auto-detects GPU for the two HuggingFace models:
- RTX 3070 (8 GB VRAM) → FP16, max_history=10
- Other NVIDIA → FP32, max_history=8
- No GPU → CPU, max_history=5
- sm_120+ (RTX 5060) → CPU fallback for HuggingFace models (Ollama still uses GPU natively)

---

## 6. Database

**Driver:** Motor (async) via `AsyncIOMotorClient`
**Connection:** Managed by `DatabaseManager` singleton in `database.py`

### Collections

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | User accounts | email (unique), full_name, role, hashed_password, login_attempts, locked_until |
| `journals` | Journal entries with AI analysis | user_id, content, mood, sentiment_label, sentiment_score, empathy_response, emotion_themes, top_emotions |
| `moods` | Standalone mood entries | user_id, mood, notes, timestamp |
| `conversations` | Chat session metadata | user_id, title, message_count, updated_at |
| `chat_messages` | Messages within conversations | conversation_id, user_id, content, sender ("user"/"ai"), timestamp |
| `chat_history` | Chat conversation history | user_id, user_message, ai_response, sentiment, timestamp, created_at |

### Indexes
- **users:** `email` (unique), `role`, `is_active`, `created_at`, compound `(email, role)`
- **journals:** compound `(user_id, created_at DESC)`, `user_id`, `mood`, `sentiment_label`, `created_at`

### User Roles
`patient` | `psychiatrist` | `admin`

---

## 7. Coding Patterns & Conventions

See `.claude/skills/fastapi-patterns.md` for full detail. Summary:

- **Routers** call services only — no DB queries in router functions
- **Services** are static-method classes (`@staticmethod async def`) — no instantiation
- **Pydantic v2** — use `@computed_field` + `@property` for serialized computed properties; `from_doc()` classmethod on Out schemas to convert MongoDB `_id` ObjectId → str
- **MongoDB** — ownership always enforced by including `user_id` in the query filter
- **Async** throughout — Motor for DB, `run_in_executor` for synchronous ML inference in async endpoints
- **Error handling** — always `except HTTPException: raise` before `except Exception as e:`
- **Timestamps** — use `datetime.now(timezone.utc)` for storage; `pytz` `Asia/Karachi` for display to users
- **JWT** — `HTTPBearer()` security scheme, decoded in `get_current_user` dependency with TTLCache (60s, 1024 entries)

---

## 8. Dependencies

### Backend — `requirements.txt` (key packages)
```
fastapi>=0.116.0          # Web framework
uvicorn>=0.35.0           # ASGI server
motor>=3.6.0              # Async MongoDB driver
pymongo>=4.9.0            # MongoDB sync driver
pydantic>=2.11.0          # Data validation (v2)
bcrypt>=4.1.0             # Password hashing
python-jose>=3.3.0        # JWT
passlib>=1.7.4            # Password utilities
torch>=2.5.0              # PyTorch (CUDA 12.1 index)
transformers>=4.35.0      # HuggingFace models
accelerate>=0.25.0        # Model acceleration
sentencepiece>=0.1.99     # Tokenizer
slowapi>=0.x              # Rate limiting
cachetools                # TTLCache for user lookups
pytz>=2024.2              # Timezone support
pytest>=7.4.0             # Testing
pytest-asyncio>=0.21.0    # Async test support
httpx>=0.25.0             # HTTP client for tests
```

### Frontend — `package.json` (key packages)
```
react@18.3.1              # UI framework
react-dom@18.3.1
react-router-dom@7.9.3    # Routing
@radix-ui/*               # 15+ UI primitives (accordion, dialog, select, etc.)
tailwindcss@3.4.17        # Utility CSS
tailwindcss-animate       # Animations
class-variance-authority  # Component variants
clsx + tailwind-merge     # Class utilities (used in lib/utils.js cn())
lucide-react@0.544.0      # Icons
recharts@3.5.1            # Charts (LineChart, PieChart)
axios@1.13.2              # HTTP client
vite@7.1.7                # Build tool
vitest@2.0.5              # Testing
@testing-library/react    # React testing utilities
```

---

## 9. Dev Commands

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate        # Linux/Mac
pip install -r requirements.txt

uvicorn app.main:app --reload   # http://localhost:8000
# API docs: http://localhost:8000/docs (debug mode only)
```

### Frontend
```bash
cd web
npm install
npm run dev                     # http://localhost:3000 (Vite dev server)
npm run build                   # Build to /build directory
npm run preview                 # Preview production build
npm test                        # Run Vitest
```

### Docker (all services)
```bash
docker-compose up --build       # Starts mongodb:27017, redis:6379, backend:8000, frontend:3000
docker-compose down
docker-compose logs backend     # View backend logs
```

### Backend Tests
```bash
cd backend
pytest tests/                   # Run test suite
pytest tests/test_auth.py -v    # Single file
MONGODB_DATABASE=theraai_test pytest  # Use test database
```

---

## 10. Environment Variables

### Backend (`.env` or system env)
| Variable | Default | Required | Purpose |
|----------|---------|----------|---------|
| `SECRET_KEY` | — | **Required** | JWT signing key |
| `MONGODB_URL` | `mongodb://localhost:27017` | Yes | Database connection |
| `MONGODB_DATABASE` | `theraai_dev` | Yes | Database name |
| `MONGODB_TEST_DATABASE` | `theraai_test` | No | Test DB name |
| `DEBUG` | `False` | No | Enables /docs, /redoc |
| `ENVIRONMENT` | `development` | No | Environment label |
| `OPENAI_API_KEY` | `None` | No | Future OpenAI integration |
| `REDIS_URL` | `redis://localhost:6379` | No | Redis cache |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | No | Allowed frontend origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | No | JWT expiry |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | No | Refresh token expiry |

### Frontend (`.env` in `web/`)
| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |
| `VITE_APP_NAME` | `TheraAI` | App display name |
| `VITE_ENVIRONMENT` | `development` | Environment label |
| `VITE_AUTH_TOKEN_KEY` | `theraai_auth_token` | localStorage key for JWT |
| `VITE_DEBUG_MODE` | `true` | Debug flag |

### Docker Compose (`.env.docker`)
```env
MONGODB_URL=mongodb://admin:password123@mongodb:27017/theraai?authSource=admin
REDIS_URL=redis://redis:6379/0
DEBUG=True
SECRET_KEY=<set this>
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 11. Frontend Component Structure & Design System

### Design System
- **Styling:** Tailwind CSS with CSS custom properties (HSL format) for theming
- **Color tokens:** `--primary`, `--secondary`, `--destructive`, `--muted`, `--accent`, `--card`, `--sidebar-*` — defined in `index.css`
- **Dark mode:** class-based (`dark:` prefix)
- **Typography:** Montserrat font family
- **Component library:** Radix UI primitives wrapped in project-specific components (`components/ui/`) — same pattern as shadcn/ui

### UI Components (`components/ui/`)
`button`, `input`, `textarea`, `card`, `dialog`, `modal`, `select`, `badge`, `avatar`, `alert`, `progress`, `separator`, `tooltip`, `skeleton` — all exported from `index.js`

### State Management
- **Auth state:** `AuthContext` (useReducer) — `user`, `isAuthenticated`, `loading`, `error`; actions: `login()`, `signup()`, `logout()`, `updateUser()`; role helpers: `hasRole()`, `isAdmin()`, `isPsychiatrist()`, `isPatient()`
- **Notifications:** `ToastContext` — `showSuccess()`, `showError()`, `showWarning()`, `showInfo()`; auto-dismiss, stacked

### Routing
- `ProtectedRoute` — requires auth, optional role check
- `PublicRoute` — redirects authenticated users away (login/signup)
- Role-based dashboard: `DashboardV0` renders `PatientDashboardV0`, `PsychiatristDashboardV0`, or `AdminDashboardV0` based on `user.role`

### API Services pattern
All frontend API calls go through `services/apiClient.js` (axios instance):
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: clears token and redirects on 401

---

## 12. Completion Status

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Authentication | ✅ Complete | ✅ Complete | JWT + roles, working E2E |
| UI Foundation / Design System | — | ✅ Complete | shadcn/ui + Tailwind |
| Patient Dashboard | ✅ Complete | ✅ Complete | Stats, achievements, activity (some mock data) |
| Journal + AI Analysis | ✅ Complete | ✅ Complete | Dual-model sentiment + emotion, full CRUD |
| AI Chat Companion | ✅ Complete | ✅ UI done | Ollama + Llama 3.1 8B via `ModelService` |
| Mood Tracker | ✅ Complete | ✅ Complete | Charts, statistics, history |
| User Stats + Achievements | ✅ Complete | ✅ Complete | Streaks, XP, 12 achievement types |
| Profile Page | Partial | ✅ Page exists | `change-password` endpoint is a stub |
| Settings Page | ❌ No backend | ✅ Page exists | Frontend-only currently |
| Assessments / Progress | ❌ No backend | ✅ Page exists | No backend routes |
| Appointments / Scheduling | ❌ No backend | ✅ Page exists | No backend routes |
| Psychiatrist Dashboard | ❌ Not started | ❌ Not started | — |
| Admin Dashboard | ❌ Not started | ❌ Not started | — |
| Patient Management (Psychiatrist) | ❌ Not started | Placeholder div | — |
| Video / Teletherapy | ❌ Not started | Component exists | `VideoCallModal.jsx` not connected |
| Real-time Messaging | ❌ Not started | ❌ Not started | No WebSocket yet |
| Community Feature | ❌ Not started | Placeholder div | — |
| Resources Library | ❌ Not started | Placeholder div | — |

---

## 13. Known Issues

> ~~**BlenderBot BROKEN**~~ — **RESOLVED.** Replaced with Ollama + Llama 3.1 8B (`services/model_service.py`). BlenderBot code preserved as comments in `ai_service.py`. Run `ollama pull llama3.1:8b` before starting the backend.

> **`change-password` is a stub** — `POST /auth/change-password` returns success without verifying or changing anything. `backend/app/api/auth.py`.

> **`datetime.utcnow()` deprecated** — Used in `models/journal.py` (`JournalInDB`) and some services. Replace with `datetime.now(timezone.utc)` everywhere for Python 3.12+ compatibility.

> **DB access in router** — `api/chat.py` queries MongoDB directly in the route handler instead of using a service class. Needs a `ChatService` extracted to `services/chat_service.py`.

> **Placeholder routes** — `/patients`, `/sessions`, `/community`, `/progress`, `/resources`, `/users` in `App.jsx` render placeholder `<div>` components, not real pages.

> **Achievements `early_bird` and `night_owl`** — hardcoded `unlocked: false` in `api/stats.py`. Not yet implemented.

> **`update_data.dict()`** — Some services use Pydantic v1's `.dict()` method instead of Pydantic v2's `.model_dump(exclude_unset=True)`.

> **Multiple legacy component versions** — `Auth/` directory has `_OLD.jsx`, `_NEW.jsx`, `*V0.jsx` variants. Only the `V0` versions are imported in `App.jsx`; others are dead code.
