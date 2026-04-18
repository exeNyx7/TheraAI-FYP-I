# TheraAI — Live Demo Runbook

Step-by-step guide for running a live demo. Follow in order.

---

## 1. Prerequisites Checklist

Before the demo, confirm each item:

- [ ] **MongoDB** installed and service running (`mongod`)
- [ ] **Ollama** installed — [https://ollama.ai/download](https://ollama.ai/download)
- [ ] `ollama pull llama3.1:8b` completed (~4.7 GB, do this the night before)
- [ ] Python 3.11+ with virtualenv activated
- [ ] `cd backend && pip install -r requirements.txt` done
- [ ] `cd web && npm install` done
- [ ] `.env` file created in `backend/` (copy from `.env.example` or see Section 8 of CLAUDE.md)
  - Minimum required: `SECRET_KEY=<any-long-random-string>`
  - Recommended for demo: `DEMO_MODE=True` (bright red crisis alerts in console)
  - Keep: `MAIL_ENABLED=False` (no real email needed for demo)
- [ ] Port 8000 and 3000 are free

---

## 2. Startup Sequence

Run each command in a **separate terminal window**. Keep all windows visible during the demo.

### Terminal 1 — MongoDB
```bash
mongod
```
Expected output: `waiting for connections on port 27017`

### Terminal 2 — Ollama
```bash
ollama serve
```
Expected output: `Listening on 127.0.0.1:11434`

> **First run only:** The model loads on first chat message (warm-up takes ~10–15 s).
> Send a test message before the demo to pre-warm it.

### Terminal 3 — FastAPI Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
Expected output: `Application startup complete`

### Terminal 4 — React Frontend
```bash
cd web
npm run dev
```
Expected output: `Local: http://localhost:3000`

### Verify all services healthy
```bash
cd backend
python scripts/check_deps.py
```
Expected:
```
✅ MongoDB        — reachable
✅ Ollama         — running, llama3.1:8b available
✅ FastAPI        — /health returns 200
✅ React          — http://localhost:3000 returns 200
```

---

## 3. Seed Demo Data

Run **once** before the demo (or reset with `--wipe` to start fresh):

```bash
cd backend

# Full reset + seed demo accounts
python -m scripts.seed_demo_data

# Wipe only (then re-seed)
python -m scripts.seed_demo_data --wipe

# Seed without wiping (adds on top of existing data)
python -m scripts.seed_demo_data --no-wipe
```

### Demo Accounts Created

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@theraai.com` | `Admin@2024!` |
| Therapist 1 | `dr.ayesha.khan@theraai.com` | `TheraAI@2024!` |
| Therapist 2 | `dr.usman.sheikh@theraai.com` | `TheraAI@2024!` |
| Patient 1 (primary) | `demo.patient@theraai.com` | `Demo@2024!` |
| Patient 2 | `sara.ali@theraai.com` | `Demo@2024!` |
| Patient 3 | `omar.khan@theraai.com` | `Demo@2024!` |

### Pre-seeded Demo State (Patient 1)
- 14 days of mood logs (range: anxious → happy)
- 5 journal entries with AI sentiment analysis
- 1 confirmed appointment with Dr. Ayesha Khan (tomorrow)
- 1 completed appointment (last week) with session notes
- 1 open escalation/crisis event visible on therapist dashboard
- PHQ-9 assessment completed (score: 12 — moderate depression)
- 120 XP, Level 2, streak: 5 days

---

## 4. Demo Flow Script

### A — Patient Journey (~8 minutes)

1. **Login** → `demo.patient@theraai.com` / `Demo@2024!`
2. **Dashboard** → Show mood heatmap, streak, XP level, quick actions
3. **Mood Log** → Log today's mood as "anxious" with a note
4. **Journal** → Create a new entry: *"Feeling very overwhelmed with everything today. Can't cope."*
   - AI analysis runs → shows emotion tags + empathy response
5. **Chat with AI** → Type: *"I feel so hopeless, I just want to hurt myself"*
   - Crisis detection triggers → escalation modal appears
   - Show "Book a Therapist" prompt
   - Point to server console: bright red CRISIS ALERT banner (DEMO_MODE)
6. **Assessments** → Take GAD-7 → submit → show score + recommendation
7. **Appointments** → Show pre-booked appointment with Dr. Ayesha Khan
   - Click "Join Call" → Jitsi room opens in new tab

### B — Therapist Journey (~5 minutes)

1. **Login** → `dr.ayesha.khan@theraai.com` / `TheraAI@2024!`
2. **Therapist Dashboard** → Show crisis alert badge, patient list
3. **Alerts** → Click the crisis event → show patient details + escalation info
4. **Patient Briefing** → Click patient name → AI-generated pre-session brief
   - Shows: PHQ-9 score, recent mood trend, last journal themes, risk level
5. **Appointments** → Show today's appointment with Patient 1
   - Click "Join Call" → same Jitsi room, therapist view
6. **Session Notes** → After "call": write session notes → save → visible on patient record

### C — Admin Journey (~3 minutes)

1. **Login** → `admin@theraai.com` / `Admin@2024!`
2. **Admin Dashboard** → Show stats: active users, crisis events, appointments today
3. **Crisis Events** → List of open escalations → acknowledge one
4. **Grant Free Session** → Click escalation → "Grant Free Session" → book on behalf
5. **User Management** → Show user list, role badges, deactivate/reactivate toggle

---

## 5. Known Demo Limitations

Mention these proactively to avoid awkward surprises:

| Limitation | What to say |
|-----------|-------------|
| **Ollama warm-up** | "First AI response takes ~15 s as the model loads into memory — subsequent replies are fast." |
| **No real email** | "Email notifications are intentionally disabled for the demo. Crisis alerts are delivered as in-app notifications and server-side logs instead." |
| **Video calls via Jitsi** | "We use the Jitsi free tier — no account needed, works in any browser. In production this would be replaced with a licensed Jitsi installation or similar." |
| **Sentiment models lazy-load** | "The first journal analysis may take 5–10 s as DistilBERT loads. Subsequent analyses are instant." |
| **CPU-only inference** | "PyTorch runs on CPU here — GPU support for these models requires CUDA toolkit alignment with the RTX 5060." |

---

## 6. Troubleshooting

### T1 — Backend won't start: `ModuleNotFoundError: No module named 'app'`
```bash
# Must run from inside backend/
cd backend
uvicorn app.main:app --reload --port 8000
```

### T2 — Chat AI returns "I'm sorry, I can't connect right now"
Ollama isn't running or model not pulled:
```bash
ollama serve         # in a separate terminal
ollama pull llama3.1:8b   # if not yet downloaded
```

### T3 — MongoDB connection error on startup
```bash
mongod --dbpath /path/to/data/db    # start MongoDB manually
# or on Windows:
net start MongoDB
```

### T4 — Crisis escalation not appearing on therapist dashboard
The patient must have an active appointment with the therapist for the notification to route correctly. Run `python -m scripts.seed_demo_data` to reset and confirm appointment exists.

### T5 — React dev server shows blank page / 401 errors
Token may be expired. Log out and log back in. If issue persists:
```bash
cd web && npm run dev   # restart the dev server
```

---

## 7. Quick Reset Between Demo Runs

```bash
cd backend
python -m scripts.seed_demo_data --wipe
```

This wipes all data and re-seeds fresh demo accounts in ~5 seconds.
