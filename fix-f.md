# TheraAI — Fix File (Phase 1 Branch)
> All known issues, root causes, and exact fixes. Work through these top-to-bottom.

---

## 🔴 CRITICAL — Fix First

### 1. Backend startup crash: `ModuleNotFoundError: No module named 'app'`

**Root cause:** `uvicorn app.main:app --reload` is being run from the **project root** (`TheraAI-FYP-I/`). Python can't find the `app` package there — it lives inside `backend/`.

**Fix — always start the backend from `backend/`:**
```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Or from project root using the `--app-dir` flag:
```powershell
backend\venv\Scripts\uvicorn app.main:app --reload --app-dir backend --port 8000
```

---

## 🔴 HIGH — App Glitchiness

### 2. Clicking buttons navigates to Landing Page (`/`) while logged in

**Root cause:** Any button that navigates to a route **not defined in `App.jsx`** hits the wildcard `<Route path="*" element={<Navigate to="/" />} />`, which silently dumps the user on the landing page. Secondary cause: if `AuthContext.loadUser()` throws (e.g. expired token + `getCurrentUser()` fails), it dispatches `LOGIN_FAILURE`, `isAuthenticated` becomes `false`, `ProtectedRoute` redirects to `/login` — but the effect looks like "being kicked out".

**Routes that exist in App.jsx** (confirmed):
`/`, `/login`, `/signup`, `/dashboard`, `/therapist-dashboard`, `/journal`, `/journal/:id`, `/mood`, `/chat`, `/progress`, `/achievements`, `/appointments`, `/assessments`, `/resources`, `/profile`, `/settings`, `/patients`, `/sessions`, `/community`, `/users`, `/unauthorized`

**Routes missing from App.jsx** (not defined, will 404 → `/`):
- `/admin` — Admin dashboard has no dedicated route; admin users hit `/dashboard` which renders `AdminDashboardV0`
- Any link in `SidebarNav` pointing to an undefined path

**Fix:**
1. Audit `SidebarNav.jsx` — check every `href`/`to` prop and ensure all targets exist in `App.jsx`
2. Add any missing routes to `App.jsx`
3. Change the wildcard to go to `/dashboard` for logged-in users instead of `/`:
   ```jsx
   // In App.jsx — replace the * route with a smarter redirect
   <Route path="*" element={<AuthAwareRedirect />} />
   ```
   ```jsx
   function AuthAwareRedirect() {
     const { isAuthenticated } = useAuth();
     return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />;
   }
   ```

---

### 3. No data being fetched on several pages

**Root cause (multiple):**
- Several frontend pages use raw `fetch()` + manually managed tokens instead of `apiClient`. Fixed for `Journal.jsx` already. Same pattern exists in other pages.
- `authService.js` was using raw `fetch` — fixed already.
- Pages that import from `authService` directly for API calls (instead of `apiClient`) won't have proper token injection or 401 handling.

**Pages to audit and migrate to `apiClient`:**
```
web/src/pages/Journal/Journal.jsx          ✅ Fixed
web/src/pages/Journal/JournalDetailV0.jsx  ❓ Check for raw fetch
web/src/pages/MoodTracker/MoodTracker.jsx  ❓ Check for raw fetch
web/src/pages/Profile/Profile.jsx          ❓ Check for raw fetch
web/src/pages/Settings/Settings.jsx        ❓ Check for raw fetch
web/src/pages/Achievements/Achievements.jsx ❓ Check for raw fetch
web/src/pages/Dashboard/DashboardV0.jsx    ❓ Check for raw fetch
```

**Pattern to fix in each file:**
```js
// WRONG (old pattern)
const token = localStorage.getItem('theraai_auth_token');
const res = await fetch(`http://localhost:8000/api/v1/...`, {
  headers: { Authorization: `Bearer ${token}` }
});

// RIGHT (use apiClient)
import apiClient from '../../apiClient';
const res = await apiClient.get('/...');
```

---

### 4. Video Call — cannot test / join

**Root cause:** `VideoCallModal` likely calls `POST /api/v1/calls/room` with an `appointment_id`, but:
- The appointment ID passed may be `undefined` (same bug as the cancel button — `apt.id` vs `apt._id`)
- The Jitsi Meet URL returned (`meet.jit.si/<room>`) opens in a new tab or an iframe — check if `VideoCallModal` opens it in an iframe or a new tab

**File:** `web/src/components/Teletherapy/VideoCallModal.jsx`

**Fix steps:**
1. Ensure `appointmentId` passed to the modal is `appt.id || appt._id` (not just `appt.id`)
2. Check if `VideoCallModal` calls the backend at all — it might just hardcode a Jitsi URL
3. If using backend: `POST /api/v1/calls/room` with `{ appointment_id: "..." }` → returns `{ jitsi_url: "..." }` → open that URL

**In `Appointments.jsx`**, the Video Call button:
```jsx
// Current (possibly wrong)
onClick={() => { setActiveAppointment(apt); setShowVideoCall(true); }}

// Pass the correct ID to VideoCallModal
// Make sure VideoCallModal receives apt.id || apt._id
```

---

### 5. Notifications — cannot check

**Root cause:** There is **no in-app notification system** in the current codebase. The `/api/v1/notifications` endpoint only handles **FCM push notification device token registration** (for Firebase Cloud Messaging). It does NOT store or return in-app notifications.

If there is a notification bell icon in the UI, it has no backend to fetch from.

**Fix options (pick one):**
- **Option A (quick):** Hide the notification bell if there's no data — show "No notifications yet"
- **Option B (proper):** Build a notifications collection in MongoDB:
  - `POST /api/v1/notifications` — create notification (triggered by appointment bookings, crisis alerts, etc.)
  - `GET /api/v1/notifications` — list user notifications
  - `PATCH /api/v1/notifications/{id}/read` — mark as read

---

## 🟡 MEDIUM — Incomplete Features

### 6. Change Password — stub (does nothing)

**File:** `backend/app/api/auth.py`

**Current state:** The endpoint accepts input, validates it via `PasswordChange` schema, but never hashes or saves the new password.

**Fix — implement the endpoint:**
```python
@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: UserOut = Depends(get_current_user)
):
    # 1. Fetch full user doc (with hashed_password)
    db = await get_database()
    user_doc = await db.users.find_one({"_id": ObjectId(current_user.id)})

    # 2. Verify current password
    from ..utils.auth import verify_password, get_password_hash
    if not verify_password(password_data.current_password, user_doc["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # 3. Hash and save new password
    new_hash = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"hashed_password": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Password changed successfully"}
```

Check `backend/app/utils/auth.py` for `verify_password` and `get_password_hash` — they should already exist since login uses them.

---

### 7. `early_bird` / `night_owl` Achievements — hardcoded false

**File:** `backend/app/api/stats.py`

**Current state:** Two achievements always return `unlocked: false` regardless of user activity.

**Fix:** Check journal/mood entry timestamps against time-of-day:
- `early_bird`: entry created between 05:00–09:00 local time
- `night_owl`: entry created between 22:00–02:00 local time

---

### 8. Journal GET 500 — old documents with schema mismatch

Already partially fixed (added per-doc try-except in `journal_service.py`). But the root cause is old documents in MongoDB that predate the current schema.

**Fix:** Run a migration to backfill missing fields on old journal docs:
```python
# Run once in a Python shell from backend/
from app.database import db_manager
import asyncio
from datetime import datetime, timezone

async def migrate():
    await db_manager.connect_to_database()
    db = db_manager.get_database()
    result = await db.journals.update_many(
        {"mood": {"$exists": False}},
        {"$set": {"mood": "neutral"}}
    )
    print(f"Updated {result.modified_count} docs missing mood")
    result2 = await db.journals.update_many(
        {"day_of_week": {"$exists": False}},
        {"$set": {"day_of_week": None}}
    )
    print(f"Updated {result2.modified_count} docs missing day_of_week")

asyncio.run(migrate())
```

---

## 🟢 PENDING — Waiting on Downloads

### 9. GPU inference (HuggingFace models — DistilBERT + RoBERTa)

**Current state:** `torch 2.6.0+cpu` installed — CPU-only build. RTX 3070 is detected by the OS (CUDA 13.2 driver) but PyTorch can't use it.

**Fix — reinstall PyTorch with CUDA support (run when ready):**
```powershell
cd backend
venv\Scripts\pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 --upgrade
```
~2.5 GB download. After install, `ai_service.py` will automatically detect RTX 3070 and switch to FP16 mode — no code changes needed.

**Verify after install:**
```powershell
venv\Scripts\python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
# Should print: True NVIDIA GeForce RTX 3070 ...
```

---

### 10. Chat AI — Ollama / Llama 3.1 8B

**Current state:** Ollama not running. Chat uses keyword-based fallback responses.

**Fix — run when ready:**
```powershell
# Terminal 1 — start the daemon
ollama serve

# Terminal 2 — pull the model (~4.7 GB)
ollama pull llama3.1:8b

# Verify
ollama list
# Should show: llama3.1:8b
```

The WebSocket chat (`/ws/chat`) and REST chat (`/chat/message`) will automatically use Ollama once it's running — no code changes needed.

---

## 📋 Quick Reference — All Fixed Bugs (already applied)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `api/moods.py` | `KeyError: 'timestamp'` on GET /moods | `.get("timestamp") or .get("created_at")` |
| 2 | `services/memory_service.py` | `unexpected kwarg 'message'` in chat WS | `message=` → `user_message=` |
| 3 | `services/journal_service.py` | 500 on GET /journals | `.dict()` → `.model_dump()` + per-doc try-except |
| 4 | `models/journal.py` | `datetime.utcnow()` deprecated | `datetime.now(timezone.utc)` |
| 5 | `config.py` | `mail_enabled` defined twice | Removed duplicate |
| 6 | `services/appointment_service.py` | `.dict()` Pydantic v2 | `.model_dump()` |
| 7 | `models/appointment.py` | `datetime.now()` no timezone | `datetime.now(timezone.utc)` |
| 8 | `TherapistDashboard.jsx` | `/therapist/stats` → 404 | `/therapist/dashboard` |
| 9 | `TherapistDashboard.jsx` + `PreSessionBriefingModal.jsx` | `/therapist/appointments/{id}/briefing` → 404 | `/therapist/patients/{patient_id}/briefing` |
| 10 | `Appointments.jsx` | `PUT /appointments/undefined/cancel` | `apt.id \|\| apt._id` |
| 11 | `authService.js` | `isMember()` checked non-existent role `'member'` | Removed, `isPatient()` uses `'patient'` |
| 12 | `Journal.jsx` | Raw `fetch` + hardcoded URL | Migrated to `apiClient` |

---

## 🚀 Suggested Testing Order (after fixes)

1. **Backend starts cleanly** — `cd backend && uvicorn app.main:app --reload`
2. **Auth** — signup new patient, login, check `/dashboard` loads
3. **Journal** — create entry, list entries, delete
4. **Mood Tracker** — log a mood, check chart
5. **Assessments** — complete PHQ-9, check score
6. **Appointments** — book with a seeded therapist, cancel
7. **Chat** — send a message (fallback responses until Ollama is running)
8. **Therapist login** — use seed account (`TheraAI@2024!`), check therapist dashboard
9. **Admin login** — check admin dashboard, user list

**Seeded therapist accounts** (password: `TheraAI@2024!`):
```
Run: cd backend && python -m scripts.seed_therapist_profiles
```
