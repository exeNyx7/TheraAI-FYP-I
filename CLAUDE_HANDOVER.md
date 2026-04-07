# TheraAI - Claude Code Context Handover

**Welcome Claude!** This document serves as your central context sheet to resume development on **TheraAI**, a full-stack mental health application.

## 📌 1. Project Overview & Tech Stack
TheraAI is an AI-powered mental health application featuring mood tracking, journaling with sentiment analysis, appointment scheduling, teletherapy, and gamification.

- **Backend:** FastAPI (Python 3.11+), MongoDB (Motor AsyncIO), Pydantic v2, PyJWT for Auth, custom DistilBERT/RoBERTa AI models running in a background thread for journal analysis.
- **Frontend:** React + Vite, Tailwind CSS, shadcn/ui components, Axios (with interceptors for auth), React Router.
- **Architecture:** We enforce layered Role-Based Access Control (RBAC) supporting three roles: `patient`, `psychiatrist`, and `admin`.

---

## 🚀 2. Current Progress (What we've done)
All frontend mockups have been successfully migrated to a robust React Vite setup. The core backend features are highly stabilized. 
- **Git State:** We are currently isolated on the `feature/phase-1-backend` branch. *Do not push to main until testing is complete.*
- **Auth System:** JWT authentication is bulletproof. Token naive/aware datetime errors and timezone bugs have been thoroughly squashed (we use `datetime.now(timezone.utc)` globally now).
- **APIs Fixed:** 
  - `POST /journals` (Removed redirect dropped-body bug; AI analysis fully hooked in).
  - `POST /moods` (Deprecation warnings for Pydantic v2 `pattern` resolved).
  - `GET /users/me/stats` (Streak calculation crash fixed).
- **RBAC:** We just created `backend/app/dependencies/rbac.py` and the schemas for the Settings backend in `backend/app/models/settings.py`.

---

## 🎯 3. The Roadmap (What you will do next)
You are picking up right at the beginning of the remaining backend infrastructure build-out. Please consult the **Implementation Plan** for exact file structures.

The remaining roadmap is chunked as follows:
1. **Phase 1 (Active):** Complete RBAC enforcement across routers, build out **Settings API** (User preferences, UI toggles) and **Assessments API**.
2. **Phase 2:** Build out the **Appointments API** (Booking logic, Therapist availability logic, integrating Teletherapy video-call states).
3. **Phase 3:** Create the **Therapist Dashboard API** (Allowing psychiatrists to fetch their assigned patients' anonymized/shared journals/moods).
4. **Phase 4:** Implement WebSockets/WebRTC signaling for the Chat and Teletherapy features.
5. **Phase 5:** Admin Dashboard (High-level data and user management).

---

## 🧠 4. Recommended Claude Skills & Coding Guidelines
When invoking Claude, explicitly ask it to adopt the persona of a **Senior Full-Stack Architect**. Make sure it keeps these rules in mind:

- **Dates and Times:** ALWAYS use `from datetime import datetime, timezone` and instantiate times with `datetime.now(timezone.utc)`. Never use naive `datetime.utcnow()`.
- **FastAPI Routing:** When defining routers, use strict trailing slash disciplines. For empty root endpoints on a router prefixed with `/items`, use `@router.get("")` instead of `@router.get("/")` to prevent `307 Temporary Redirect` bugs dropping POST bodies.
- **Pydantic V2:** Use `pattern=` instead of `regex=` for `Query` strings. Use `model_config = ConfigDict(...)` instead of the old `class Config:` subclass.
- **Tooling:** Prefer surgically scoped file edits. Do not overhaul a file if only a function needs an update. 

---

## 📁 5. Context Files to Maintain
To keep you (Claude) perfectly aligned, you should actively read and update these files as you progress:

1. **`implementation_plan.md`:** (Found in the agent artifacts directory or root if copied). This is the strict blueprint of what to code. Update it when architectural scope changes.
2. **`todo.md` & `code_audit_report.md`:** Maintain the to-do list for pending security items (like dropping local JWTs in favor of HttpOnly cookies later).
3. **`CLAUDE_HANDOVER.md`:** (This file) Update the "Current Progress" section whenever you finish a major Phase, so the context remains fresh if the session resets.
4. **`project_reference.md`:** Use this for high-level business logic understanding of what TheraAI is supposed to be. 
