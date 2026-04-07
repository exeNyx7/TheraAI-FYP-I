---
name: TheraAI Project Overview
description: Core context for TheraAI - AI-powered mental health app, tech stack, phase progress
type: project
---

TheraAI is a full-stack mental health application (FYP) with mood tracking, journaling, appointments, teletherapy, and gamification.

**Tech stack:** FastAPI (Python 3.11+) + Motor/MongoDB backend, React + Vite + Tailwind + shadcn/ui frontend. JWT auth with 3 roles: patient, psychiatrist, admin.

**Key rules enforced:**
- Always `datetime.now(timezone.utc)` — never `datetime.utcnow()`
- Router empty paths use `@router.get("")` not `"/"` (prevents 307 redirect dropping POST body)
- Pydantic v2: `pattern=` not `regex=`, use `ConfigDict` not inner `class Config`

**Phase 1 — COMPLETED (2026-03-28):**
- `backend/app/dependencies/rbac.py` — `require_role(*roles)` factory + pre-built guards: `require_patient`, `require_therapist`, `require_admin`, `require_therapist_or_admin`
- `backend/app/models/settings.py` — `UserSettings`, `UserSettingsUpdate`, `UserSettingsOut`
- `backend/app/services/settings_service.py` — `get_settings`, `upsert_settings`, `delete_account`
- `backend/app/api/settings.py` — GET/PUT `/api/v1/settings`, DELETE `/api/v1/settings/account`
- `backend/app/models/assessments.py` — template + result schemas
- `backend/app/services/assessments_service.py` — scoring engine, template-based AI recommendations
- `backend/app/api/assessments.py` — 5 endpoints (list, get, submit, history, result detail)
- `backend/scripts/seed_assessments.py` — PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check
- `database.py` updated with indexes for user_settings, assessments, assessment_results
- `main.py` updated to register settings + assessments routers

**Phase 2 next:** Appointments API + Therapist Dashboard (therapist_profiles, appointments collections).

**Why:** Phase 2 depends on Phase 1 RBAC — use `require_therapist` and `require_patient` guards in appointment endpoints.
