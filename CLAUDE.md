# TheraAI — Claude Code Context

> Read this file at the start of every session. It is the single source of truth for project state, rules, and what to build next.

---

## 1. What Is TheraAI

An AI-powered mental health platform (Final Year Project) with:
- Mood tracking, journaling + AI sentiment analysis
- Clinical assessments (PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check)
- AI chatbot (BlenderBot) with emotion detection (GoEmotions/RoBERTa)
- Appointment scheduling & teletherapy
- Role-based dashboards for patients, psychiatrists, and admins

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.11+), Motor AsyncIO, MongoDB |
| Auth | PyJWT, HTTPBearer, TTLCache |
| AI | DistilBERT (sentiment), RoBERTa GoEmotions (emotions), BlenderBot-400M (chat) |
| Frontend | React 18 + Vite, Tailwind CSS, shadcn/ui, React Router v7, Axios |
| Database | MongoDB (`theraai_dev`) via Motor async driver |

---

## 3. Non-Negotiable Coding Rules

### Backend
- **Datetime**: ALWAYS `from datetime import datetime, timezone` → `datetime.now(timezone.utc)`. NEVER `datetime.utcnow()`.
- **Router paths**: Empty root endpoints use `@router.get("")` NOT `@router.get("/")` — prevents 307 redirect that drops POST bodies.
- **Pydantic v2**: Use `pattern=` not `regex=`. Use `model_config = ConfigDict(...)` not inner `class Config`.
- **ObjectId**: Always `ObjectId(user_id)` when querying `_id` in MongoDB. Never pass raw string.
- **Services**: All DB methods are `async`. Always `await` Motor calls.

### Frontend
- **Routing**: NEVER navigate to a route that doesn't exist in `App.jsx`. Check first.
- **API calls**: Use `apiClient` from `web/src/apiClient.js` — it auto-attaches JWT and handles 401.
- **Hardcoded data rule**: When backend for a module is built, remove ALL mock/hardcoded data from that module's frontend. Keep mock data only for modules with no backend yet.
- **Role-based UI**: SidebarNav renders different items per role. Never show patient pages to psychiatrists or admins.

---

## 4. Roles

| Role | Value | Access |
|------|-------|--------|
| Patient | `patient` | Journal, Chat, Mood, Assessments, Achievements, Appointments |
| Psychiatrist | `psychiatrist` | Therapist Dashboard, My Patients, Appointments |
| Admin | `admin` | Dashboard, Users, Reports |

RBAC is enforced via `backend/app/dependencies/rbac.py`:
```python
from ..dependencies.rbac import require_patient, require_therapist, require_admin, require_therapist_or_admin
```

---

## 5. Project Structure

```
TheraAI-FYP-I/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── dependencies/   # auth.py, rbac.py, rate_limit.py
│   │   ├── models/         # Pydantic schemas
│   │   ├── services/       # Business logic (async)
│   │   ├── utils/          # auth helpers
│   │   ├── database.py     # Motor connection + indexes
│   │   ├── config.py       # Settings (env vars)
│   │   └── main.py         # FastAPI app + router registration
│   └── scripts/
│       └── seed_assessments.py
└── web/
    └── src/
        ├── apiClient.js        # Axios instance with JWT interceptor
        ├── App.jsx             # All routes defined here
        ├── contexts/
        │   └── AuthContext.jsx # user.role available via useAuth()
        ├── components/
        │   └── Dashboard/SidebarNav.jsx  # Role-based navigation
        └── pages/
```

---

## 6. API Base

All endpoints: `http://localhost:8000/api/v1/`

`apiClient.js` automatically appends `/api/v1` if `VITE_API_URL` is set to just the domain.

---

## 7. Phase Progress

### ✅ Phase 1 — COMPLETE
**Backend:**
- `dependencies/rbac.py` — role guard factory + pre-built guards
- `models/settings.py` + `services/settings_service.py` + `api/settings.py`
  - `GET /api/v1/settings`, `PUT /api/v1/settings`, `DELETE /api/v1/settings/account`
- `models/assessments.py` + `services/assessments_service.py` + `api/assessments.py`
  - `GET /api/v1/assessments` — list templates
  - `GET /api/v1/assessments/{slug}` — get with questions
  - `POST /api/v1/assessments/{slug}/submit` — score + AI recommendation
  - `GET /api/v1/assessments/history` — user history
  - `GET /api/v1/assessments/history/{id}` — result detail
- `scripts/seed_assessments.py` — seeds PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check

**Frontend:**
- `AssessmentSelector.jsx` — fetches from API, no hardcoded data
- `Assessments.jsx` — full assessment taking form (one question at a time), results view, history view
- `SidebarNav.jsx` — role-based navigation (patient / psychiatrist / admin)

### 🔲 Phase 2 — NEXT
**Appointments API:**
- Collections: `therapist_profiles`, `appointments`
- `GET/POST /appointments` — list & book
- `GET /appointments/{id}`, `PATCH /appointments/{id}/status`, `POST /appointments/{id}/cancel`
- `GET /therapists`, `GET /therapists/{id}`, `GET /therapists/{id}/slots`

**Therapist Dashboard API:**
- `GET /therapist/dashboard` — aggregate stats
- `GET /therapist/patients` — assigned patients
- `GET /therapist/patients/{id}/history` — patient timeline
- `GET /therapist/alerts` — AI-flagged at-risk patients
- `PUT/POST /therapist/profile` — therapist profile management

**Frontend (when backend is ready — remove all hardcoded data):**
- `Appointments.jsx` — wire to API
- `TherapistDashboard.jsx` — wire to API

### 🔲 Phase 3 — Real-Time (WebSocket)
- Chat: `/ws/chat/{conversation_id}`
- WebRTC signaling: `/ws/call/{appointment_id}`

### 🔲 Phase 4 — AI Enhancements
- Weekly mood trend summaries
- Pre-session therapist briefings
- Crisis detection in chat

### 🔲 Phase 5 — Integrations
- Google Calendar sync
- Email notifications (fastapi-mail)
- Push notifications (FCM)

### 🔲 Phase 6 — Admin Dashboard + Seed Data
- `GET/PATCH/DELETE /admin/users`
- `GET /admin/dashboard`
- Full seed script with faker

---

## 8. Database Collections

| Collection | Status | Description |
|-----------|--------|-------------|
| `users` | ✅ Existing | Auth, roles, profile |
| `journals` | ✅ Existing | Journal entries + AI analysis |
| `moods` | ✅ Existing | Mood records |
| `chat_history` | ✅ Existing | Chatbot conversations |
| `conversations` | ✅ Existing | Conversation metadata |
| `user_settings` | ✅ Phase 1 | User preferences |
| `assessments` | ✅ Phase 1 | Assessment templates (seeded) |
| `assessment_results` | ✅ Phase 1 | User submissions + scores |
| `therapist_profiles` | 🔲 Phase 2 | Therapist bio, availability, rates |
| `appointments` | 🔲 Phase 2 | Booking records |
| `messages` | 🔲 Phase 3 | Real-time chat messages |

---

## 9. How to Run

```bash
# Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Seed assessments (first time only)
python -m scripts.seed_assessments

# Frontend
cd web
npm start   # runs on http://localhost:3000
```

---

## 10. Git Workflow

- Active dev branch: `feature/phase-1-backend`
- Worktree branch: `claude/nice-bartik`
- Changes are made in worktree → pushed to `feature/phase-1-backend` → user pulls locally
- **Do not push to `main` until testing is complete**
