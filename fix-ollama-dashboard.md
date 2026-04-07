# Fix Plan: Therapist Dashboard, Theme Bug, Responsiveness, Ollama, OAuth & Email Setup

---

## Fix 1 — Restore Therapist Dashboard (TherapistSidebar)

**Problem:** TherapistDashboard.jsx was changed to use SidebarNav instead of TherapistSidebar.
The screenshot shows the correct UI: a dedicated therapist sidebar with Dashboard, My Patients,
Schedule, Messaging, Treatment Plans, Progress, Settings, Log Out — at route `/therapist-dashboard`.

**What to revert:**

### `web/src/pages/Therapist/TherapistDashboard.jsx`
- Remove `import { SidebarNav }` — restore `import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar'`
- Restore original outer layout that TherapistSidebar expects
- Keep the `useNavigate` removal (it was causing redirect loops)

### `web/src/App.jsx`
- Restore the full ProtectedRoute for `/therapist-dashboard`:
  ```jsx
  <Route
    path="/therapist-dashboard"
    element={
      <ProtectedRoute roles={['psychiatrist', 'therapist', 'admin']}>
        <TherapistDashboard />
      </ProtectedRoute>
    }
  />
  ```
- Restore `/patients` → `/therapist-dashboard` redirect
- Keep the TherapistDashboard import

### `web/src/pages/Dashboard/DashboardV0.jsx`
- Revert `psychiatrist` case back to `<PsychiatristDashboardV0 />` (or keep rendering TherapistDashboard — verify what PsychiatristDashboardV0 looks like first)
- The `therapist` role (if used) should navigate to `/therapist-dashboard`

### `web/src/components/Dashboard/TherapistSidebar.jsx`
- Fix broken nav links. Current links point to non-existent routes.
- Map each item to a working route:

| Label          | Fix                                          |
|----------------|----------------------------------------------|
| Dashboard      | `/therapist-dashboard`                       |
| My Patients    | `/therapist-dashboard` (or `/patients`)      |
| Schedule       | `/appointments` (reuse existing page)        |
| Messaging      | placeholder or `/chat`                       |
| Treatment Plans| placeholder page at `/treatment-plans`       |
| Progress       | `/assessments` or `/progress`                |
| Settings       | `/settings`                                  |
| Log Out        | keep logout action                           |

---

## Fix 2 — Theme Flips to Dark on Settings Mount

**Root cause:** Settings.jsx has this `useEffect`:
```js
useEffect(() => {
  // applies theme to DOM + calls savePreference({ theme })
}, [theme]);
```
This runs on **initial mount** with whatever `theme` state was initialized to. If `user?.theme`
is `undefined` (new user, field not in DB yet), it falls back to `localStorage.getItem('theme')`.
If localStorage is also empty, it defaults to `'system'`, which then checks
`prefers-color-scheme: dark` — and if the OS is set to dark mode, it immediately adds the
`dark` class. It then also writes `system` back to backend (overwriting nothing but it triggers
a PUT /auth/me on every Settings page visit).

**Fix:** Only save to backend when the user explicitly changes the theme — not on mount.

```js
const isFirstRender = useRef(true);

useEffect(() => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);

  if (isFirstRender.current) {
    isFirstRender.current = false;
    return; // don't save on initial mount
  }
  savePreference({ theme });
}, [theme]);
```

Also import `useRef` alongside `useState, useEffect`.

**File:** `web/src/pages/Settings/Settings.jsx`

---

## Fix 3 — Responsiveness / UI Glitches

**Investigation needed** (read these files before fixing):
- `web/src/pages/Therapist/TherapistDashboard.jsx` — check wrapper div classes
- `web/src/components/Dashboard/TherapistSidebar.jsx` — check mobile/collapse logic
- `web/src/pages/Dashboard/PatientDashboardV0.jsx` — check grid layout

**Common patterns to fix:**

### Sidebar layout
All pages that use SidebarNav or TherapistSidebar should follow:
```jsx
<div className="flex min-h-screen bg-background">
  <Sidebar />
  <main className="flex-1 overflow-auto min-w-0">
    {/* content */}
  </main>
</div>
```
The `min-w-0` on main prevents flex children from overflowing.

### Grid cards
Replace fixed-width grids with responsive ones:
```jsx
// Bad:
<div className="grid grid-cols-4 gap-4">
// Good:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Tables / overflow
Wrap any tables in `<div className="overflow-x-auto">`.

### Mobile sidebar
TherapistSidebar already has a hamburger menu (`Menu` icon + `X` icon) for mobile.
Confirm the toggle state (`isOpen`) works and that the overlay closes it on click.

**After reading files:** fix specific classes case-by-case.

---

## Fix 4 — Ollama CUDA Illegal Memory Access (RTX 3070 8GB)

**Error:** `CUDA error: an illegal memory access was encountered` at `ggml-cuda.cu:2981`
after a few successful requests, then auto-restart loops.

**Root cause (most likely):** VRAM overflow. Llama 3.1 8B Q4_K_M needs ~5.5 GB for weights.
At 8 GB available, long conversations push the KV cache over the limit — CUDA then accesses
freed/invalid memory → crash.

### Fixes (try in order):

**Option A — Reduce context window (most effective)**
```bash
# In Modelfile or via env var:
OLLAMA_NUM_CTX=2048 ollama serve
```
Or create a custom Modelfile:
```
FROM llama3.1:8b
PARAMETER num_ctx 2048
PARAMETER num_gpu 99
```
Then: `ollama create theraai-llama -f Modelfile`

**Option B — Limit GPU layers (offload some to CPU)**
```bash
OLLAMA_NUM_GPU=28 ollama serve   # instead of all 33 layers on GPU
```
This keeps ~1.5 GB headroom. Slight speed reduction but stable.

**Option C — Update GPU drivers + CUDA toolkit**
- NVIDIA driver ≥ 535 recommended for Ollama on Windows
- Download: https://www.nvidia.com/Download/index.aspx
- After updating, run: `ollama serve` fresh

**Option D — Switch to smaller quantization**
```bash
ollama pull llama3.1:8b-instruct-q3_K_M
```
Q3_K_M uses ~4.1 GB vs Q4_K_M's ~5.5 GB — gives 2+ GB headroom for KV cache.

**Option E — Environment variable workaround (Windows-specific)**
```bash
set CUDA_LAUNCH_BLOCKING=1
ollama serve
```
Forces synchronous CUDA ops — slower but often avoids the race condition causing the crash.

**Option F — Use CPU only temporarily**
```bash
set OLLAMA_NUM_GPU=0
ollama serve
```
Slow but stable. Good for testing if the issue is purely GPU-related.

### In `backend/app/services/model_service.py`
Add context length to the chat request to prevent long conversations from growing unbounded:
```python
"options": {
    "num_ctx": 2048,        # add this
    "temperature": 0.7,
    "top_p": 0.9,
}
```
Also truncate conversation history to the last N messages (already partially done — verify
`AI_MAX_CONVERSATION_HISTORY` env var is set to ≤ 10).

---

## Setup Guide: Google OAuth (Login + Google Calendar)

### Step 1 — Create a Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "TheraAI")
3. Enable these APIs (APIs & Services → Library):
   - **Google+ API** (for login user info)
   - **Google Calendar API** (for calendar integration)
   - **Google People API** (for profile info)

### Step 2 — Create OAuth 2.0 Credentials
1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorized redirect URIs:
   ```
   http://localhost:5173/api/v1/auth/google/callback
   http://localhost:8000/api/v1/auth/google/callback
   ```
   (Add your production domain when deploying)
4. Copy **Client ID** and **Client Secret**

### Step 3 — Add to backend/.env
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
FRONTEND_URL=http://localhost:5173
```

### Step 4 — Complete the Backend Callback
The `GET /auth/google/callback` stub in `auth.py` needs to be implemented:
```python
# Install: pip install httpx
import httpx

# In the callback handler:
async with httpx.AsyncClient() as client:
    # 1. Exchange code for tokens
    token_res = await client.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": f"{settings.frontend_url}/api/v1/auth/google/callback",
        "grant_type": "authorization_code",
    })
    tokens = token_res.json()

    # 2. Get user info
    user_res = await client.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    google_user = user_res.json()
    # google_user has: email, name, picture, sub (Google ID)

    # 3. Find or create user in DB, return JWT
```

### Step 5 — Google Calendar (frontend)
The Google Calendar button in Settings currently just shows a placeholder.
For real integration, use the Google Calendar API with the OAuth token from Step 4.
Store the `refresh_token` on the user document when they connect via Google.

---

## Setup Guide: Email / SMTP Configuration

### Using Gmail (simplest for development)

1. **Enable 2-Factor Authentication** on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create an App Password (select "Mail" + "Windows Computer")
4. Copy the 16-character password

Add to `backend/.env`:
```env
MAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your.email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx   # the 16-char app password
FROM_EMAIL=your.email@gmail.com
```

### Using a Transactional Email Service (recommended for production)

**Resend** (generous free tier, easy setup):
1. Sign up at https://resend.com
2. Add and verify your domain
3. Create an API key
4. Use SMTP bridge:
   ```env
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USERNAME=resend
   SMTP_PASSWORD=re_your_api_key_here
   FROM_EMAIL=noreply@yourdomain.com
   MAIL_ENABLED=true
   ```

**SendGrid** (also popular):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com
MAIL_ENABLED=true
```

### Verify it works
```bash
cd backend
python -c "
import asyncio
from app.services.email_service import EmailService
asyncio.run(EmailService.send_otp_email('test@example.com', '123456'))
"
```

If `MAIL_ENABLED=false` (default), emails are just logged to console — useful for dev
without needing real SMTP.

---

## Execution Order

1. Fix TherapistSidebar nav links (broken routes)
2. Restore TherapistDashboard to use TherapistSidebar
3. Restore App.jsx `/therapist-dashboard` route
4. Fix Settings.jsx theme useEffect (add isFirstRender guard)
5. Fix responsiveness (read each dashboard file, fix grid + overflow classes)
6. Fix Ollama: add `num_ctx: 2048` to model_service.py options + set env var
7. Configure SMTP in .env (for OTP emails to work)
8. Configure Google OAuth credentials (optional — works as stub without them)
