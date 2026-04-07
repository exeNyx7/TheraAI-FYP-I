# TheraAI — Claude Code Reference

> Single source of truth for project state and rules. Read at session start.

---

## 1. Project Overview

AI-powered mental health platform (FYP). Roles: `patient`, `psychiatrist`, `admin`.

**Stack:** FastAPI + Python 3.11 + Pydantic v2 | MongoDB (Motor async) | React 18 + Vite 7 + Tailwind | Axios `apiClient` | JWT auth | Ollama/Llama 3.1 8B chat | DistilBERT + RoBERTa GoEmotions

**Dev:**
```bash
cd backend && uvicorn app.main:app --reload --port 8000
cd web && npm run dev  # http://localhost:3000
```

**Seed (first time):**
```bash
cd backend
python -m scripts.seed_assessments
python -m scripts.seed_therapist_profiles   # password: TheraAI@2024!
```

---

## 2. Non-Negotiable Coding Rules

### Backend
- **Datetime**: `datetime.now(timezone.utc)` — NEVER `datetime.utcnow()`
- **Router paths**: `@router.get("")` NOT `"/"` for collection endpoints
- **Pydantic v2**: `.model_dump()` not `.dict()` | `pattern=` not `regex=` | `ConfigDict(...)` not inner `class Config`
- **ObjectId**: `ObjectId(user_id)` when querying `_id` — never raw string
- **Services**: All DB methods `async`/`await`. No DB in routers.
- **Error order**: `except HTTPException: raise` BEFORE `except Exception as e:`
- **RBAC**: `from ..dependencies.rbac import require_patient, require_therapist, require_admin`

### Frontend
- **API calls**: ALWAYS `apiClient` from `web/src/apiClient.js`. NEVER raw `fetch` or hardcoded `http://localhost:8000`
- **Routes**: Only navigate to routes that exist in `App.jsx`
- **MongoDB IDs**: `item.id || item._id` — backend may return either

---

## 3. Folder Structure (key paths)

```
backend/app/
├── main.py, config.py, database.py
├── api/         auth.py, journal.py, chat.py, moods.py, stats.py, conversations.py,
│                assessments.py, appointments.py, therapist.py, settings.py, admin.py
├── models/      user.py, journal.py, mood.py, conversation.py, assessments.py,
│                appointments.py, settings.py
├── services/    ai_service.py, model_service.py, user_service.py, journal_service.py,
│                mood_service.py, conversation_service.py, assessments_service.py,
│                appointments_service.py, therapist_service.py, settings_service.py
├── dependencies/ auth.py, rbac.py, rate_limit.py
└── utils/       auth.py

web/src/
├── App.jsx, apiClient.js
├── pages/       Auth/, Dashboard/, Chat/, Journal/, MoodTracker/, Profile/,
│                Settings/, Appointments/, Assessments/, Achievements/, Therapist/, Landing/
├── components/  ui/, Dashboard/SidebarNav.jsx, Teletherapy/VideoCallModal.jsx,
│                Therapist/PreSessionBriefingModal.jsx, Gamification/AchievementTracker.jsx
├── contexts/    AuthContext.jsx, ToastContext.jsx
└── services/    authService.js, chatService.js, journalService.js, moodService.js
```

---

## 4. API Routes (base: `/api/v1`)

| Resource | Key Endpoints |
|----------|--------------|
| Auth | POST `/auth/signup`, POST `/auth/login`, GET/PUT `/auth/me`, POST `/auth/change-password` |
| Journals | CRUD `/journals`, GET `/journals/stats` |
| Moods | CRUD `/moods`, GET `/moods/stats` |
| Chat | POST `/chat/message`, GET/DELETE `/chat/history` |
| Stats | GET `/users/me/stats`, `/users/me/achievements`, `/users/me/activity`, `/users/me/weekly-summary` |
| Assessments | GET `/assessments`, GET `/assessments/{slug}`, POST `/assessments/{slug}/submit`, GET `/assessments/history` |
| Appointments | CRUD `/appointments`, POST `/appointments/{id}/cancel`, GET `/therapists`, GET `/therapists/{id}/slots` |
| Therapist | GET `/therapist/dashboard`, `/therapist/patients`, `/therapist/patients/{id}/briefing`, `/therapist/alerts`, CRUD `/therapist/profile` |
| Settings | GET/PUT `/settings`, DELETE `/settings/account` |
| Admin | GET `/admin/dashboard`, `/admin/users`, `/admin/crisis-events`, PATCH/DELETE `/admin/users/{id}` |
| WebSocket | WS `/ws/chat?token=<JWT>` |

---

## 5. Roles & Navigation

| Role | Dashboard | Nav items |
|------|-----------|-----------|
| `patient` | `/dashboard` | journal, chat, mood, assessments, achievements, appointments, profile, settings |
| `psychiatrist` | `/therapist-dashboard` | therapist-dashboard, appointments, profile, settings |
| `admin` | `/dashboard` | dashboard, users, resources, profile, settings |

---

## 6. Phase Progress

All phases complete (1–6). Active branch: `feature/phase-1-backend`.

- Phase 1: RBAC, settings, assessments, seed scripts, frontend assessment flow
- Phase 2: Appointments, therapist dashboard, therapist profiles
- Phase 3: WebSocket chat (`/ws/chat`), auto-reconnect hook
- Phase 4: Weekly mood summary, pre-session briefing, crisis detection
- Phase 5: Email notifications (MAIL_ENABLED=False by default)
- Phase 6: Admin dashboard (full rewrite with real API data)

---

## 7. Known Issues & Status (as of 2026-04-01)

| Issue | Status |
|-------|--------|
| `change-password` stub | ✅ FIXED — fully implemented in `api/auth.py` |
| `early_bird`/`night_owl` hardcoded False | ✅ FIXED — time-based check in `api/stats.py` |
| Raw `fetch` in MoodTracker.jsx | ✅ FIXED → apiClient |
| Raw `fetch` in Settings.jsx (change-password) | ✅ FIXED → apiClient |
| Achievements.jsx hardcoded demo data | ✅ FIXED → fetches `/users/me/achievements` |
| App.jsx `*` route sends logged-in users to `/` | ✅ FIXED → `AuthAwareRedirect` |
| VideoCallModal gets undefined appointmentId | ✅ FIXED → `apt.id \|\| apt._id` |
| Backend startup crash `ModuleNotFoundError: No module named 'app'` | run from `backend/` dir |
| torch CPU-only (no CUDA) | PENDING — `pip install torch --index-url .../cu124` (~2.5 GB) |
| Ollama not running | PENDING — `ollama pull llama3.1:8b` (~4.7 GB) |
| `api/chat.py` queries DB in router | OPEN — should be in ChatService |
| `JournalDetailV0.jsx`, `DashboardV0.jsx` | Not audited for raw fetch — check if needed |
| Old journal docs missing `mood`/`day_of_week` | Migration script in fix-f.md |
| In-app notifications | Not built — FCM only; show "No notifications" if bell exists |

---

## 8. Environment Variables

| Var | Default |
|-----|---------|
| `SECRET_KEY` | required |
| `MONGODB_URL` | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | `theraai_dev` |
| `VITE_API_URL` | `http://localhost:8000` |
| `VITE_AUTH_TOKEN_KEY` | `theraai_auth_token` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` |
| `OLLAMA_MODEL` | `llama3.1:8b` |
