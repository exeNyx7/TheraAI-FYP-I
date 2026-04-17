# TheraAI — Fix File 2 (Observed Issues)
> Issues identified from live testing. No solutions here — fix in a follow-up session.

---

## 🔴 CRITICAL

### 1. Chat AI produces garbled/binary output

**Observed:** Second or later chat messages return corrupted text like:
```
8C9=72;CC:!4>:?4795BG:<??65>$+'>BG9),*B%DHG'1-59D21>...
```

**Root cause (suspected):** Old chat history records in MongoDB were written by the deprecated BlenderBot model, which generated corrupted/binary-looking responses due to CUDA `sm_120` incompatibility. When `ws.py` / `chat.py` loads conversation history (`db.chat_history.find(...)`) and feeds it to Llama 3.1 as prior context, those corrupted old records pollute the context window. Llama then produces a confused or corrupted response.

**Affected files:**
- `backend/app/api/ws.py` — loads history at lines 132–140
- `backend/app/api/chat.py` — loads history at lines 142–145
- MongoDB collection: `chat_history` (contains old BlenderBot garbage)

---

### 2. Jitsi video call shows login screen instead of joining session

**Observed:** Clicking "Join Session" opens a Jitsi page at `meet.jit.si` that shows:
```
Sign in with Google  |  Sign in with GitHub
```
Users cannot join the call without a Jitsi account.

**Root cause:** The public `meet.jit.si` server began requiring authentication for all new rooms. The `#config.prejoinPageEnabled=false` URL fragment appended in `VideoCallModal.jsx` does not bypass this login — it only controls the local pre-join UI, not the server-side auth gate.

**Affected file:** `web/src/components/Teletherapy/VideoCallModal.jsx`

---

## 🔴 HIGH

### 3. Google Calendar integration — OAuth 401 `invalid_client`

**Observed:** Clicking "Connect Google Calendar" in Settings → Authorization Error:
```
Error 401: invalid_client
The OAuth client was not found.
```

**Root cause:** The Google OAuth 2.0 client credentials (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) in the backend `.env` are either missing, placeholder values, or belong to a deleted/unconfigured Google Cloud project. The OAuth app also needs the correct redirect URI registered in Google Cloud Console.

**Affected files:**
- `backend/.env` — missing or invalid `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `backend/app/api/calendar.py` — constructs the OAuth URL using these credentials

---

### 4. Two separate therapist dashboards — inconsistent feature availability

**Observed:** Therapist users have access to two different dashboards:
- `/dashboard` (default on login) → renders `PsychiatristDashboardV0.jsx` — older, simpler view
- `/therapist-dashboard` (via sidebar links) → renders `TherapistDashboard.jsx` — newer, richer view with briefings and patient actions

Features work on one (`/therapist-dashboard`) but not on the other (`/dashboard`). This causes confusion about which is canonical and whether features are missing or broken.

**Affected files:**
- `web/src/pages/Dashboard/DashboardV0.jsx` — dispatches psychiatrist role to `PsychiatristDashboardV0`
- `web/src/pages/Dashboard/PsychiatristDashboardV0.jsx` — old dashboard
- `web/src/pages/Therapist/TherapistDashboard.jsx` — new dashboard
- `web/src/App.jsx` — both `/dashboard` and `/therapist-dashboard` routes active

---

## 🟡 MEDIUM

### 5. Ollama does not start automatically after PC restart

**Observed:** After rebooting, the model is still downloaded (`ollama list` shows `llama3.1:8b`) but the backend logs:
```
ModelService: Cannot connect to Ollama at http://localhost:11434. Is Ollama running?
```
Chat falls back to keyword-based responses. User must manually run `ollama serve` every time the PC restarts.

**Root cause:** Ollama is not registered as a Windows startup service. It must be started manually.

**Scope:** Environment / OS setup — not a code bug, but affects app behaviour on every reboot.

---

## 📋 Context: What was already fixed (fix-f.md)

See `fix-f.md` for the full list of 12 bugs already resolved on `feature/phase-1-backend`.
