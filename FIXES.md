# TheraAI — Codebase Audit Fixes

Summary of all changes made during the full consistency audit (2026-03-30).

---

## Backend Fixes

### 1. `backend/app/models/mood.py` — Deprecated datetime + moved validation to model
**What was wrong:**
- Used deprecated `datetime.utcnow` as `default_factory` (removed in Python 3.12+)
- Mood validation was duplicated in two router functions instead of the model

**What was changed:**
- Added `VALID_MOODS` constant and `MoodType` enum for reuse
- Changed `default_factory=datetime.utcnow` → `default_factory=lambda: datetime.now(timezone.utc)` (2 instances)
- Added `@field_validator('mood')` on `MoodCreate` and `MoodUpdate` — validation now lives in the model, not the router

---

### 2. `backend/app/models/conversation.py` — Deprecated datetime
**What was wrong:**
- Three fields used deprecated `default_factory=datetime.utcnow`

**What was changed:**
- Added `timezone` to `datetime` import
- Changed all 3 `default_factory=datetime.utcnow` → `default_factory=lambda: datetime.now(timezone.utc)`

---

### 3. `backend/app/api/moods.py` — Business logic in router
**What was wrong:**
- `create_mood()` and `update_mood()` each contained a hardcoded `valid_moods` list with inline validation — business logic that belongs in the model layer

**What was changed:**
- Removed both `valid_moods` lists and the manual `HTTPException` raise from both endpoints
- Validation now handled automatically by `@field_validator` in `MoodCreate` / `MoodUpdate`

---

### 4. `backend/app/services/mood_service.py` — Pydantic v2 compatibility
**What was wrong:**
- `mood_data.dict(exclude_unset=True)` used Pydantic v1's deprecated `.dict()` method

**What was changed:**
- Changed to `mood_data.model_dump(exclude_unset=True)` (Pydantic v2 API)

---

## Frontend Fixes

### 5. `web/src/contexts/AuthContext.jsx` — Debug console.log in production
**What was wrong:**
- A `setTimeout` with `console.log('Login successful! Welcome back!')` was left in the `login()` function — dead debug code that would appear in production

**What was changed:**
- Removed the entire `setTimeout` block

---

### 6. `web/src/services/chatService.js` — Hardcoded localhost URL bypassing auth interceptors
**What was wrong:**
- The service imported `axios` directly and defined `const API_BASE_URL = 'http://localhost:8000/api/v1'`
- All 8 functions manually retrieved the token from localStorage and set the `Authorization` header on each request
- This bypassed the centralized auth interceptors in `apiClient.js`, meaning 401 handling and token refresh logic was not applied

**What was changed:**
- Replaced `import axios from 'axios'` with `import apiClient from './apiClient'`
- Removed `API_BASE_URL` constant and all manual `Authorization` header construction
- All 8 functions now call `apiClient.get/post/put/delete()` with relative paths

---

### 7. `web/src/services/statsService.js` — Hardcoded localhost URL
**What was wrong:**
- Same pattern as chatService.js: `const API_BASE_URL = 'http://localhost:8000/api/v1'` with manual auth headers

**What was changed:**
- Replaced axios with `apiClient`; all 3 functions use relative paths with no manual auth

---

### 8. `web/src/pages/Chat/Chat.jsx` — Raw fetch(), silent error, inline font style
**What was wrong:**
- `sendMessage()` used a raw `fetch()` call with a hardcoded URL instead of the chat service layer
- The `catch` block silently added a fallback AI message without notifying the user
- The root element had `style={{ fontFamily: 'Montserrat' }}` inline instead of using the Tailwind `font-sans` class (Montserrat is mapped to `font-sans` in `tailwind.config.js`)

**What was changed:**
- Added `import { sendChatMessage } from '../../services/chatService'`
- Replaced raw `fetch()` call with `sendChatMessage(content)` from the service layer
- Added `showError()` toast in the catch block for user-visible error feedback
- Removed `style={{ fontFamily: 'Montserrat' }}` → added `font-sans` to className

---

## General / New Files

### 9. `.env.example` — Missing environment variable documentation
**What was wrong:**
- No `.env.example` file existed. New contributors had no way to know what environment variables were required to run the project.

**What was added:**
- Comprehensive `.env.example` covering all backend vars (`SECRET_KEY`, `MONGODB_URL`, `DEBUG`, `REDIS_URL`, `CORS_ORIGINS`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, JWT expiry settings), all frontend Vite vars, and Docker Compose vars

---

### 10. `README.md` — Missing root-level documentation
**What was wrong:**
- No root-level README existed. All documentation was scattered in subdirectories.

**What was added:**
- Root `README.md` with: prerequisites, quick-start instructions (local + Docker), environment config guide, project structure tree, full API overview table (31 endpoints across 6 groups), test commands, and completion status table

---

## Testing Infrastructure

### 11. `backend/tests/conftest.py` — Missing shared test fixtures
**What was added:**
- Full pytest-asyncio fixture file: `async_client`, `mock_db` (AsyncMock collections), `mock_ai_service`, `mock_ollama`, `user_factory`, `authenticated_headers`, `test_user_id`, sample data fixtures for journal/mood/conversation/message
- Enables consistent, isolated unit tests across all backend test files

### 12. `backend/tests/test_auth.py` — Legacy sync test code replaced
**What was wrong:**
- File contained legacy synchronous `TestClient` tests mixed with broken syntax (merged lines from a previous session), incompatible with `pytest-asyncio` async fixtures

**What was changed:**
- Fully replaced with async `pytest-asyncio` test classes
- 8 test classes: `TestAuthSignup`, `TestAuthLogin`, `TestAuthGetMe`, `TestAuthUpdateMe`, `TestAuthRefresh`, `TestAuthLogout`, `TestAuthChangePassword`, `TestAuthHealth`, `TestAuthFlow`
- 25+ async test cases covering happy paths, validation errors, auth failures, and E2E flow

### 13. `.github/workflows/test.yml` — Missing CI/CD pipeline
**What was added:**
- GitHub Actions workflow with two parallel jobs: `backend-tests` (pytest with MongoDB service container + Codecov coverage upload) and `frontend-tests` (Vitest with coverage upload)
- Triggers on push/PR to `main` and `develop` branches

### 14. `.claude/skills/testing-strategy.md` — Testing patterns documentation
**What was added:**
- 600+ line skill file documenting all testing conventions: pytest-asyncio patterns, mock fixtures, service test patterns, React Testing Library patterns, MSW handler setup, CI/CD workflow reference

---

## Not Yet Fixed (Tracked for Next Session)

The following issues were identified during the audit but not yet addressed:

- **Inline `style={{ fontFamily: 'Montserrat' }}`** — Remaining in ~10 components: `LoginV0.jsx`, `SignupV0.jsx`, `Journal.jsx`, `JournalDetailV0.jsx`, `MoodTracker.jsx`, `Profile.jsx`, `AddJournalModal.jsx`, `SidebarNav.jsx`, `DashboardHeader.jsx`
- **Silent catch blocks** — `MoodTracker.jsx` `fetchMoods()` and `Journal.jsx` `handleDelete()` have empty catch blocks with no error handling
- **Missing type hints** — Numerous backend functions across routers and services lack explicit return type annotations
- **Business logic in `api/stats.py`** — Achievements (lines 145-268), stats calculation (81-128), and activity feed (288-311) should be extracted to a `StatsService` class
- **Direct MongoDB in `api/chat.py`** — `db.chat_history` operations should be moved to a `ChatHistoryService`
- **Large components** — `SignupV0.jsx` (285 lines), `JournalDetailV0.jsx` (284 lines), `MoodTracker.jsx` (258 lines) exceed the 200-line guideline
- **`change-password` stub** — `POST /auth/change-password` returns success without verifying or changing anything
- **`early_bird` / `night_owl` achievements** — Hardcoded `unlocked: false` in `api/stats.py`, not yet implemented
