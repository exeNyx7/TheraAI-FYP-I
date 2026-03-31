# TheraAI — Claude Code Reference

> Read this file at the start of every session. It is the single source of truth for project state, coding rules, and what to build next.

---

## 1. What Is TheraAI

An AI-powered mental health platform (Final Year Project) with:
- Mood tracking, journaling + AI sentiment analysis (DistilBERT + RoBERTa GoEmotions)
- Clinical assessments (PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check)
- AI chatbot (Ollama / Llama 3.1 8B) with emotion detection
- Appointment scheduling & teletherapy
- Role-based dashboards for patients, psychiatrists, and admins

**AI stack:** 2 local HuggingFace models (DistilBERT + RoBERTa) + Ollama/Llama 3.1 8B for chat

---

## 2. Tech Stack

| Layer | Technology | Version / Details |
|-------|-----------|-------------------|
| **Backend** | FastAPI + Python | Python 3.11, Pydantic v2, uvicorn |
| **Async DB driver** | Motor | MongoDB async (Motor 3.6+) |
| **Database** | MongoDB | 7.0 |
| **Cache** | Redis | 7 Alpine (session/rate-limit support) |
| **AI/ML** | PyTorch + HuggingFace Transformers | CUDA 12.1 index, GPU-adaptive |
| **Auth** | JWT (HS256) + bcrypt | Access token 30 min, refresh 7 days |
| **Frontend** | React 18 + Vite 7 | React Router 7, Tailwind CSS 3.4 |
| **UI components** | Radix UI + shadcn/ui style | 15+ primitives, Lucide icons |
| **Charts** | Recharts 3.5 | Line, Pie charts |
| **HTTP client** | Axios 1.13 | With interceptors for auth |
| **DevOps** | Docker Compose | 4 containers: mongodb, redis, backend, frontend |

---

## 3. Non-Negotiable Coding Rules

### Backend
- **Datetime**: ALWAYS `from datetime import datetime, timezone` → `datetime.now(timezone.utc)`. NEVER `datetime.utcnow()`.
- **Router paths**: Empty root endpoints use `@router.get("")` NOT `@router.get("/")` — prevents 307 redirect that drops POST bodies.
- **Pydantic v2**: Use `pattern=` not `regex=`. Use `model_config = ConfigDict(...)` not inner `class Config`. Use `.model_dump()` not `.dict()`.
- **ObjectId**: Always `ObjectId(user_id)` when querying `_id` in MongoDB. Never pass raw string.
- **Services**: All DB methods are `async`. Always `await` Motor calls.
- **Routers call services only** — no DB queries in router functions.
- **Error handling**: always `except HTTPException: raise` before `except Exception as e:`.
- **RBAC**: enforce via `backend/app/dependencies/rbac.py`:
  ```python
  from ..dependencies.rbac import require_patient, require_therapist, require_admin, require_therapist_or_admin
  ```

### Frontend
- **Routing**: NEVER navigate to a route that doesn't exist in `App.jsx`. Check first.
- **API calls**: Use `apiClient` from `web/src/apiClient.js` — it auto-attaches JWT and handles 401. NEVER import `axios` directly or hardcode `http://localhost:8000`.
- **Hardcoded data rule**: When backend for a module is built, remove ALL mock/hardcoded data from that module's frontend.
- **Role-based UI**: SidebarNav renders different items per role. Never show patient pages to psychiatrists or admins.

---

## 4. Roles

| Role | Value | Access |
|------|-------|--------|
| Patient | `patient` | Journal, Chat, Mood, Assessments, Achievements, Appointments |
| Psychiatrist | `psychiatrist` | Therapist Dashboard, My Patients, Appointments |
| Admin | `admin` | Dashboard, Users, Reports |

---

## 5. Folder Structure

```
TheraAI-FYP-I/
├── CLAUDE.md                        # This file
├── FIXES.md                         # Audit change log
├── README.md                        # Quick-start guide
├── docker-compose.yml               # 4-service orchestration
├── .env.example                     # All env vars documented
├── .github/workflows/
│   ├── ci.yml                       # CI Pipeline (build + docker)
│   └── test.yml                     # Tests (pytest + vitest + codecov)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # FastAPI app, lifespan, router registration
│   │   ├── config.py                # Pydantic Settings (all env vars with defaults)
│   │   ├── database.py              # Motor async MongoDB manager + index setup
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # /auth — signup, login, me, JWT refresh
│   │   │   ├── journal.py           # /journals — CRUD + AI analysis
│   │   │   ├── chat.py              # /chat — Ollama/Llama 3.1 8B
│   │   │   ├── moods.py             # /moods — standalone mood entries
│   │   │   ├── stats.py             # /users — stats, achievements, activity
│   │   │   ├── conversations.py     # /conversations — chat session management
│   │   │   ├── assessments.py       # /assessments — templates + submission + history
│   │   │   ├── appointments.py      # /appointments + /therapists
│   │   │   ├── therapist.py         # /therapist — dashboard + patients + profile
│   │   │   └── settings.py          # /settings — user preferences
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── journal.py
│   │   │   ├── mood.py
│   │   │   ├── conversation.py
│   │   │   ├── assessments.py
│   │   │   ├── appointments.py
│   │   │   └── settings.py
│   │   ├── services/
│   │   │   ├── ai_service.py        # DistilBERT + RoBERTa singleton
│   │   │   ├── model_service.py     # Ollama/Llama 3.1 8B chat + fallback
│   │   │   ├── user_service.py
│   │   │   ├── journal_service.py
│   │   │   ├── mood_service.py
│   │   │   ├── conversation_service.py
│   │   │   ├── assessments_service.py
│   │   │   ├── appointments_service.py
│   │   │   ├── therapist_service.py
│   │   │   └── settings_service.py
│   │   ├── dependencies/
│   │   │   ├── auth.py              # get_current_user, TTLCache
│   │   │   ├── rbac.py              # require_patient/therapist/admin guards
│   │   │   └── rate_limit.py
│   │   └── utils/
│   │       └── auth.py
│   ├── scripts/
│   │   ├── seed_assessments.py
│   │   └── seed_therapist_profiles.py
│   ├── ml/
│   │   └── finetuning/              # Dataset download, preprocess, finetune, evaluate
│   └── tests/
│       ├── conftest.py              # pytest-asyncio fixtures
│       ├── test_auth.py
│       ├── test_journal.py
│       ├── test_ai_service.py
│       └── test_chatbot_conversations.py
├── web/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                  # All routes defined here
│       ├── main.jsx
│       ├── apiClient.js             # Axios instance + JWT interceptors
│       ├── pages/
│       │   ├── Auth/                # LoginV0.jsx, SignupV0.jsx
│       │   ├── Dashboard/           # DashboardV0 → patient/psychiatrist/admin
│       │   ├── Chat/                # Chat.jsx
│       │   ├── Journal/             # Journal.jsx, JournalDetailV0.jsx
│       │   ├── MoodTracker/         # MoodTracker.jsx
│       │   ├── Profile/             # Profile.jsx
│       │   ├── Settings/            # Settings.jsx
│       │   ├── Appointments/        # Appointments.jsx
│       │   ├── Assessments/         # Assessments.jsx
│       │   ├── Achievements/        # Achievements.jsx
│       │   ├── Therapist/           # TherapistDashboard.jsx
│       │   └── Landing/             # LandingPageV0.jsx
│       ├── components/
│       │   ├── ui/                  # button, card, input, dialog, badge, avatar, etc.
│       │   ├── Chat/                # MessageBubble, SessionHistory, VoiceInput
│       │   ├── Journal/             # JournalCard, JournalForm, AddJournalModal, MoodSelector
│       │   ├── Dashboard/           # DashboardHeader, SidebarNav, ActivityHeatmap, QuickActions
│       │   ├── Landing/             # HeroSection, FeaturesGrid, CTASection
│       │   ├── Auth/                # Login, Signup
│       │   ├── Navigation/          # Navbar, Footer
│       │   ├── Appointments/        # TherapistSelector, PaymentCheckout
│       │   ├── Teletherapy/         # VideoCallModal (not connected)
│       │   └── Gamification/        # AchievementTracker
│       ├── services/
│       │   ├── authService.js
│       │   ├── chatService.js
│       │   ├── journalService.js
│       │   ├── moodService.js
│       │   └── statsService.js
│       ├── contexts/
│       │   ├── AuthContext.jsx      # user, isAuthenticated, login/logout/signup, role helpers
│       │   └── ToastContext.jsx     # showSuccess/Error/Warning/Info
│       └── lib/
│           └── utils.js             # cn() helper
└── .claude/
    └── skills/
        ├── fastapi-patterns.md
        ├── react-design-system.md
        └── testing-strategy.md
```

---

## 6. All API Routes

Base prefix: `/api/v1`

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Get current user profile |
| PUT | `/auth/me` | Yes | Update user profile |
| POST | `/auth/change-password` | Yes | Change password (**stub**) |
| POST | `/auth/refresh` | Yes | Refresh access token |
| POST | `/auth/logout` | Yes | Logout |

### Journals — `/api/v1/journals`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/journals` | Yes | Create entry — auto-runs AI analysis |
| GET | `/journals` | Yes | List entries |
| GET | `/journals/stats` | Yes | Mood + sentiment statistics |
| GET | `/journals/{id}` | Yes | Get single entry |
| PUT | `/journals/{id}` | Yes | Update (re-runs AI if content changed) |
| DELETE | `/journals/{id}` | Yes | Delete (204) |

### Chat — `/api/v1/chat`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/message` | Yes | Send message to Llama 3.1 8B |
| GET | `/chat/history` | Yes | Get recent history |
| DELETE | `/chat/history` | Yes | Clear history |

### Moods — `/api/v1/moods`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/moods` | Yes | Create mood entry |
| GET | `/moods` | Yes | List mood history |
| GET | `/moods/stats` | Yes | Stats by period (7d/30d/90d/all) |
| GET | `/moods/{id}` | Yes | Get single entry |
| PUT | `/moods/{id}` | Yes | Update |
| DELETE | `/moods/{id}` | Yes | Delete (204) |

### Stats — `/api/v1/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me/stats` | Yes | Streaks, XP, level, mood average |
| GET | `/users/me/achievements` | Yes | 12 achievement milestones |
| GET | `/users/me/activity` | Yes | Recent activity feed |

### Conversations — `/api/v1/conversations`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/conversations` | Yes | Create conversation |
| GET | `/conversations` | Yes | List conversations |
| GET | `/conversations/{id}` | Yes | Get metadata |
| GET | `/conversations/{id}/messages` | Yes | Get messages |
| PUT | `/conversations/{id}` | Yes | Rename |
| DELETE | `/conversations/{id}` | Yes | Delete + messages (204) |

### Assessments — `/api/v1/assessments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/assessments` | Yes | List templates (PHQ-9, GAD-7, PSS-10, WHO-5, Wellness) |
| GET | `/assessments/{slug}` | Yes | Get template with questions |
| POST | `/assessments/{slug}/submit` | Yes | Submit answers — returns score + AI recommendation |
| GET | `/assessments/history` | Yes | User's submission history |
| GET | `/assessments/history/{id}` | Yes | Single result detail |

### Appointments — `/api/v1/appointments` + `/api/v1/therapists`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/appointments` | Yes | List user's appointments |
| POST | `/appointments` | Yes | Book appointment |
| GET | `/appointments/{id}` | Yes | Get appointment detail |
| PATCH | `/appointments/{id}/status` | Yes | Update status |
| POST | `/appointments/{id}/cancel` | Yes | Cancel appointment |
| GET | `/therapists` | Yes | List all therapist profiles |
| GET | `/therapists/{id}` | Yes | Get therapist profile |
| GET | `/therapists/{id}/slots` | Yes | Available booking slots |

### Therapist Dashboard — `/api/v1/therapist`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/therapist/dashboard` | Therapist | Stats, upcoming appointments, alerts |
| GET | `/therapist/patients` | Therapist | Patient list |
| GET | `/therapist/patients/{id}/history` | Therapist | Patient's session + assessment history |
| GET | `/therapist/alerts` | Therapist | Flagged/high-risk patients |
| GET | `/therapist/profile` | Therapist | Own therapist profile |
| POST | `/therapist/profile` | Therapist | Create profile |
| PUT | `/therapist/profile` | Therapist | Update profile |

### Settings — `/api/v1/settings`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | Yes | Get user settings |
| PUT | `/settings` | Yes | Update settings |
| DELETE | `/settings/account` | Yes | Delete account |

### Admin — `/api/v1/admin` (Admin only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard` | Admin | Platform-wide stats |
| GET | `/admin/users` | Admin | Paginated user list (search, role filter) |
| GET | `/admin/users/{id}` | Admin | Single user detail |
| PATCH | `/admin/users/{id}/status` | Admin | Activate / deactivate account |
| DELETE | `/admin/users/{id}` | Admin | Hard-delete user + cascade data |
| GET | `/admin/crisis-events` | Admin | All platform crisis events (last 30d) |

### Weekly Summary — `/api/v1/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me/weekly-summary` | Yes | 7-day mood trend + AI insight |

### Pre-Session Briefing — `/api/v1/therapist`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/therapist/appointments/{id}/briefing` | Therapist | Patient mood, crisis events, journal excerpt + AI notes |

### WebSocket — `/ws`
| Protocol | Path | Auth | Description |
|----------|------|------|-------------|
| WS | `/ws/chat?token=<JWT>` | JWT query param | Real-time AI chat with typing indicator + crisis detection |

---

## 7. AI Model Integrations

### Model 1 — DistilBERT Sentiment
- **ID:** `distilbert-base-uncased-finetuned-sst-2-english` (~268 MB)
- **Purpose:** Binary sentiment (POSITIVE / NEGATIVE)
- **Flow:** `ai_service.analyze_sentiment()` → `ai_service.analyze_text()` → `JournalService`

### Model 2 — RoBERTa GoEmotions
- **ID:** `SamLowe/roberta-base-go_emotions` (~499 MB)
- **Purpose:** 28-category multi-label emotion detection (top 5 above 10% confidence)
- **Flow:** `ai_service.analyze_emotions()` → same journal flow

### Model 3 — Ollama / Llama 3.1 8B ✅ ACTIVE
- **Model:** `llama3.1:8b` at `http://localhost:11434`
- **Purpose:** Conversational chat for wellness companion
- **Flow:** `model_service.py → ModelService.generate_response()` → `api/chat.py`
- **Fallback:** keyword-based responses if Ollama is not running
- **System prompt:** therapist persona with CBT/DBT, crisis detection, Pakistan cultural context, Umang hotline (0317-4288665)
- **~~BlenderBot~~** — deprecated, code commented out in `ai_service.py`

### GPU Detection (HuggingFace models only — Ollama self-manages)
- RTX 3070 (8 GB VRAM) → FP16
- Other NVIDIA → FP32
- sm_120+ (RTX 5060) → CPU fallback for HuggingFace (Ollama still uses GPU natively)
- No GPU → CPU

---

## 8. Database Collections

| Collection | Status | Key Fields |
|-----------|--------|-----------|
| `users` | ✅ | email (unique), full_name, role, hashed_password, login_attempts, locked_until |
| `journals` | ✅ | user_id, content, mood, sentiment_label, sentiment_score, empathy_response, emotion_themes |
| `moods` | ✅ | user_id, mood, notes, timestamp |
| `conversations` | ✅ | user_id, title, message_count, updated_at |
| `chat_messages` | ✅ | conversation_id, user_id, content, sender, timestamp |
| `chat_history` | ✅ | user_id, user_message, ai_response, sentiment, timestamp |
| `user_settings` | ✅ Phase 1 | user_id, preferences |
| `assessments` | ✅ Phase 1 | slug, title, questions (seeded) |
| `assessment_results` | ✅ Phase 1 | user_id, slug, answers, score, recommendation |
| `therapist_profiles` | ✅ Phase 2 | user_id, bio, availability, rates, specializations |
| `appointments` | ✅ Phase 2 | patient_id, therapist_id, slot, status, payment |
| `messages` | ✅ Phase 3 | Real-time chat (WebSocket — ws.py) |

**Indexes:**
- `users`: `email` (unique), `role`, `is_active`, `created_at`
- `journals`: compound `(user_id, created_at DESC)`, `mood`, `sentiment_label`

---

## 9. Coding Patterns & Conventions

See `.claude/skills/fastapi-patterns.md` for full detail.

- **Services**: static-method classes (`@staticmethod async def`) — never instantiate
- **Pydantic v2**: `@computed_field` + `@property` for computed props; `from_doc()` classmethod on Out schemas for ObjectId → str
- **MongoDB ownership**: always include `user_id` in query filter
- **Async**: Motor for DB, `run_in_executor` for synchronous ML inference
- **Timestamps**: `datetime.now(timezone.utc)` for storage; `pytz Asia/Karachi` for display

---

## 10. Dependencies

### Backend (`requirements.txt` — key packages)
```
fastapi>=0.116.0, uvicorn>=0.35.0, motor>=3.6.0, pymongo>=4.9.0
pydantic>=2.11.0, bcrypt>=4.1.0, python-jose>=3.3.0, passlib>=1.7.4
torch>=2.5.0, transformers>=4.35.0, accelerate>=0.25.0, sentencepiece
slowapi, cachetools, pytz>=2024.2, httpx>=0.25.0
pytest>=7.4.0, pytest-asyncio>=0.21.0
```

### Frontend (`package.json` — key packages)
```
react@18.3.1, react-dom@18.3.1, react-router-dom@7.9.3
@radix-ui/*, tailwindcss@3.4.17, lucide-react@0.544.0
recharts@3.5.1, axios@1.13.2, vite@7.1.7, vitest@2.0.5
```

---

## 11. Dev Commands

```bash
# Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Seed data (first time only)
python -m scripts.seed_assessments
python -m scripts.seed_therapist_profiles   # 4 therapists, password: TheraAI@2024!

# Frontend
cd web
npm run dev           # http://localhost:3000

# Docker (all services)
docker-compose up --build

# Tests
cd backend && pytest tests/ -v
cd web && npm run test -- --run
```

---

## 12. Environment Variables

### Backend
| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_KEY` | — | JWT signing key (**required**) |
| `MONGODB_URL` | `mongodb://localhost:27017` | DB connection |
| `MONGODB_DATABASE` | `theraai_dev` | DB name |
| `DEBUG` | `False` | Enables /docs, /redoc |
| `REDIS_URL` | `redis://localhost:6379` | Redis cache |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT expiry |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token expiry |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server |
| `OLLAMA_MODEL` | `llama3.1:8b` | Chat model |

### Frontend (`web/.env`)
| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |
| `VITE_APP_NAME` | `TheraAI` | App display name |
| `VITE_AUTH_TOKEN_KEY` | `theraai_auth_token` | localStorage key |

See `.env.example` for full reference including Docker vars.

---

## 13. Frontend Design System

- **Styling:** Tailwind CSS, CSS custom properties (HSL), dark mode via `dark:` prefix
- **Font:** Montserrat → mapped to `font-sans` in `tailwind.config.js` (use class, not inline style)
- **Component library:** Radix UI primitives in `components/ui/` (shadcn/ui pattern)
- **Auth state:** `AuthContext` — `user`, `isAuthenticated`, `loading`; `hasRole()`, `isAdmin()`, `isPsychiatrist()`, `isPatient()`
- **Toasts:** `ToastContext` — `showSuccess()`, `showError()`, `showWarning()`, `showInfo()`
- **Protected routes:** `ProtectedRoute` (requires auth + optional role), `PublicRoute` (redirects if logged in)

---

## 14. Phase Progress

### ✅ Phase 1 — COMPLETE
- `dependencies/rbac.py` — role guard factory
- `models/settings.py` + `services/settings_service.py` + `api/settings.py`
- `models/assessments.py` + `services/assessments_service.py` + `api/assessments.py`
- `scripts/seed_assessments.py` — seeds PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check
- Frontend: `AssessmentSelector.jsx`, `Assessments.jsx` (full flow), `SidebarNav.jsx` (role-based)

### ✅ Phase 2 — COMPLETE
- `models/appointments.py` + `services/appointments_service.py` + `api/appointments.py`
- `services/therapist_service.py` + `api/therapist.py`
- `scripts/seed_therapist_profiles.py` — 4 Pakistani therapist accounts
- Frontend: `TherapistSelector.jsx`, `Appointments.jsx`, `TherapistDashboard.jsx` (all live data, no mocks)

### ✅ Phase 3 — Real-Time (WebSocket) — COMPLETE
- `api/ws.py` — `/ws/chat?token=<JWT>` WebSocket endpoint with crisis detection + memory injection
- `web/src/hooks/useWebSocketChat.js` — React hook with auto-reconnect + REST fallback
- Chat.jsx updated: WS-first send, REST fallback, Live/REST indicator badge

### ✅ Phase 4 — AI Enhancements — COMPLETE
- `GET /users/me/weekly-summary` — 7-day mood trend + AI insight string
- `web/src/components/Dashboard/WeeklyMoodSummary.jsx` — bar chart widget on PatientDashboard
- `GET /therapist/appointments/{id}/briefing` — pre-session patient briefing
- `web/src/components/Therapist/PreSessionBriefingModal.jsx` — modal on TherapistDashboard "Briefing" button
- Crisis detection: backend complete (CrisisService), frontend banner + Book Therapist button in Chat.jsx

### ✅ Phase 5 — Email Notifications — COMPLETE (MAIL_ENABLED=False by default)
- `services/email_service.py` — EmailService with welcome, confirmation, reminder, crisis alert templates
- `requirements.txt` — added `fastapi-mail`, `jinja2`
- `config.py` — MAIL_* env vars
- Wired: signup welcome, appointment confirmation, crisis alert (high/emergency severity)

### ✅ Phase 6 — Admin Dashboard — COMPLETE
- `api/admin.py` — `/admin/dashboard`, `/admin/users` (paginated+filtered), `/admin/users/{id}/status`, `/admin/users/{id}` DELETE, `/admin/crisis-events`
- `AdminDashboardV0.jsx` — full rewrite: real API data, tabbed UI (Overview / Users / Crisis Events), search + role filter, activate/deactivate/delete users

---

## 15. Known Issues

> **`change-password` is a stub** — `POST /auth/change-password` returns success without doing anything. `backend/app/api/auth.py`.

> **DB access in `api/chat.py`** — queries MongoDB directly in the route handler. Should be extracted to a `ChatHistoryService`.

> **`early_bird` / `night_owl` achievements** — hardcoded `unlocked: false` in `api/stats.py`. Not yet implemented.

> **Multiple legacy frontend components** — `Auth/` has `_OLD.jsx`, `_NEW.jsx`, `*V0.jsx` variants. Only `V0` versions are used; others are dead code.

> **`change-password` missing implementation** — endpoint exists but does not hash or store the new password.

---

## 16. Git Workflow

- Active dev branch: `feature/phase-1-backend`
- **Do not push directly to `main`** until testing is complete
- Worktree branches (Claude Code): `claude/*` — merged into `feature/phase-1-backend` when done
