#!/usr/bin/env python3
"""
TheraAI Database Seed Script
-----------------------------
Populates the MongoDB database with realistic test data:
  - 1 admin user
  - 2 psychiatrists
  - 3 patients
  - Appointments (scheduled, completed, cancelled)
  - Mood entries
  - Journal entries
  - Crisis events

Usage:
    python scripts/seed_db.py
    python scripts/seed_db.py --env backend/.env
    python scripts/seed_db.py --wipe   # clears ALL data before seeding
    python scripts/seed_db.py --dry-run

All users are created with password: TheraAI@2024
"""

import asyncio
import argparse
import sys
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Path bootstrap — make sure we can import from backend/app
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

def load_env(env_path: str):
    """Load .env file manually (avoid pydantic-settings requiring all vars)"""
    path = Path(env_path)
    if not path.exists():
        print(f"[warn] .env file not found at {path}, using existing environment")
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val

# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

SEED_PASSWORD = "TheraAI@2024"

PSYCHIATRISTS = [
    {
        "full_name": "Dr. Emily Carter",
        "email": "dr.carter@theraai.dev",
        "role": "psychiatrist",
        "is_active": True,
        "specialization": "Cognitive Behavioral Therapy",
    },
    {
        "full_name": "Dr. James Okafor",
        "email": "dr.okafor@theraai.dev",
        "role": "psychiatrist",
        "is_active": True,
        "specialization": "Trauma and PTSD",
    },
]

PATIENTS = [
    {
        "full_name": "Sarah Johnson",
        "email": "sarah.johnson@example.com",
        "role": "patient",
        "is_active": True,
    },
    {
        "full_name": "Michael Chen",
        "email": "michael.chen@example.com",
        "role": "patient",
        "is_active": True,
    },
    {
        "full_name": "Emma Wilson",
        "email": "emma.wilson@example.com",
        "role": "patient",
        "is_active": True,
    },
]

ADMIN = {
    "full_name": "TheraAI Admin",
    "email": "admin@theraai.dev",
    "role": "admin",
    "is_active": True,
}

MOODS = ["happy", "sad", "anxious", "calm", "angry", "hopeful", "frustrated", "neutral"]

JOURNAL_ENTRIES = [
    "Today was a challenging day but I managed to use some breathing techniques that helped.",
    "Feeling much better after talking to Dr. Carter. The CBT exercises are working.",
    "Had a panic attack this morning. Reached out to the crisis line which helped.",
    "Slept well for the first time in weeks. Gratitude journal helping.",
    "Difficult session today but I feel like we made real progress on my past trauma.",
    "Practiced mindfulness for 20 minutes. Feeling calmer than yesterday.",
    "Struggled with intrusive thoughts but didn't act on them. That's progress.",
    "Had a great day — met a friend for coffee and felt genuinely happy.",
]

# ---------------------------------------------------------------------------
# Async seed logic
# ---------------------------------------------------------------------------

async def seed(wipe: bool = False, dry_run: bool = False):
    from motor.motor_asyncio import AsyncIOMotorClient
    from passlib.context import CryptContext
    from bson import ObjectId

    mongo_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGODB_DATABASE", "theraai_dev")

    print(f"[info] Connecting to {mongo_url}/{db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_pw = pwd_ctx.hash(SEED_PASSWORD)

    now = datetime.now(timezone.utc)

    if dry_run:
        print("[dry-run] Would seed the following:")
        print(f"  Users: 1 admin + {len(PSYCHIATRISTS)} psychiatrists + {len(PATIENTS)} patients")
        print(f"  Appointments: ~{len(PATIENTS) * 3}")
        print(f"  Mood entries: ~{len(PATIENTS) * 5}")
        print(f"  Journal entries: ~{len(PATIENTS) * 3}")
        client.close()
        return

    # ------------------------------------------------------------------
    # Optional wipe
    # ------------------------------------------------------------------
    if wipe:
        confirm = input("[warn] --wipe will DELETE ALL DATA in the database. Type 'yes' to confirm: ")
        if confirm.strip().lower() != "yes":
            print("[abort] Wipe cancelled.")
            client.close()
            return
        for col in ["users", "appointments", "moods", "journals", "crisis_events", "device_tokens", "conversations"]:
            await db[col].drop()
        print("[info] All collections dropped.")

    # ------------------------------------------------------------------
    # Helper: upsert user (idempotent by email)
    # ------------------------------------------------------------------
    async def upsert_user(data: dict) -> str:
        doc = {
            "full_name": data["full_name"],
            "email": data["email"],
            "role": data["role"],
            "is_active": data.get("is_active", True),
            "hashed_password": hashed_pw,
            "created_at": now,
            "updated_at": None,
            "google_refresh_token": None,
            "google_calendar_connected": False,
        }
        result = await db.users.find_one_and_update(
            {"email": data["email"]},
            {"$setOnInsert": doc},
            upsert=True,
            return_document=True,
        )
        uid = str(result["_id"])
        print(f"  [user] {data['role']:12s}  {data['full_name']} <{data['email']}>  id={uid}")
        return uid

    # ------------------------------------------------------------------
    # Seed users
    # ------------------------------------------------------------------
    print("\n[+] Seeding users...")
    admin_id = await upsert_user(ADMIN)
    psych_ids = [await upsert_user(p) for p in PSYCHIATRISTS]
    patient_ids = [await upsert_user(p) for p in PATIENTS]

    # ------------------------------------------------------------------
    # Seed appointments
    # ------------------------------------------------------------------
    print("\n[+] Seeding appointments...")
    appt_ids = []
    statuses_cycle = ["scheduled", "completed", "cancelled", "scheduled", "completed"]

    for i, patient_id in enumerate(patient_ids):
        therapist_id = psych_ids[i % len(psych_ids)]
        for j, appt_status in enumerate(statuses_cycle[:3]):
            scheduled_at = now + timedelta(days=(j + 1) * 3) if appt_status == "scheduled" else now - timedelta(days=(j + 1) * 7)
            doc = {
                "patient_id": patient_id,
                "therapist_id": therapist_id,
                "scheduled_at": scheduled_at,
                "duration_minutes": 50,
                "type": "video",
                "status": appt_status,
                "notes": f"Session {j + 1} for patient {PATIENTS[i]['full_name']}",
                "jitsi_room_name": None,
                "google_calendar_event_id": None,
                "patient_calendar_event_id": None,
                "therapist_calendar_event_id": None,
                "reminder_sent": appt_status != "scheduled",
                "created_at": now - timedelta(days=30),
                "updated_at": None,
            }
            result = await db.appointments.insert_one(doc)
            appt_ids.append(str(result.inserted_id))
            print(f"  [appt] {appt_status:10s}  {PATIENTS[i]['full_name']} ↔ {PSYCHIATRISTS[i % len(PSYCHIATRISTS)]['full_name']}  {scheduled_at.strftime('%Y-%m-%d')}")

    # ------------------------------------------------------------------
    # Seed mood entries
    # ------------------------------------------------------------------
    print("\n[+] Seeding mood entries...")
    import random
    random.seed(42)
    for patient_id in patient_ids:
        for day_offset in range(14):
            mood_val = random.choice(MOODS)
            doc = {
                "user_id": patient_id,
                "mood": mood_val,
                "score": random.randint(1, 10),
                "notes": f"Feeling {mood_val} today.",
                "created_at": now - timedelta(days=day_offset),
            }
            await db.moods.insert_one(doc)
        print(f"  [mood] 14 entries for {patient_ids.index(patient_id) + 1}. patient")

    # ------------------------------------------------------------------
    # Seed journal entries
    # ------------------------------------------------------------------
    print("\n[+] Seeding journal entries...")
    for patient_id in patient_ids:
        entries = random.sample(JOURNAL_ENTRIES, k=4)
        for day_offset, entry in enumerate(entries):
            hour = random.choice([7, 10, 14, 22])  # mix early/late for achievement testing
            created_at = (now - timedelta(days=day_offset)).replace(hour=hour, minute=0, second=0, microsecond=0)
            doc = {
                "user_id": patient_id,
                "content": entry,
                "mood": random.choice(MOODS),
                "tags": random.sample(["anxiety", "progress", "sleep", "therapy", "mindfulness"], k=2),
                "created_at": created_at,
                "updated_at": None,
            }
            await db.journals.insert_one(doc)
        print(f"  [journal] 4 entries for {patient_ids.index(patient_id) + 1}. patient")

    # ------------------------------------------------------------------
    # Seed crisis events (for therapist alerts demo)
    # ------------------------------------------------------------------
    print("\n[+] Seeding crisis events...")
    for i, patient_id in enumerate(patient_ids[:2]):  # Only first 2 patients
        therapist_id = psych_ids[i % len(psych_ids)]
        doc = {
            "patient_id": patient_id,
            "therapist_id": therapist_id,
            "severity": "high" if i == 0 else "medium",
            "trigger": "Expressed suicidal ideation during chat session",
            "ai_summary": "Patient mentioned feeling hopeless and not wanting to continue.",
            "acknowledged": False,
            "acknowledged_by": None,
            "acknowledged_at": None,
            "created_at": now - timedelta(hours=random.randint(1, 48)),
        }
        await db.crisis_events.insert_one(doc)
        print(f"  [crisis] severity={doc['severity']}  patient={PATIENTS[i]['full_name']}")

    client.close()

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)
    print(f"  Database   : {db_name}")
    print(f"  Admin      : {ADMIN['email']}")
    print(f"  Password   : {SEED_PASSWORD}  (all accounts)")
    print()
    print("  Psychiatrists:")
    for p in PSYCHIATRISTS:
        print(f"    {p['email']}")
    print()
    print("  Patients:")
    for p in PATIENTS:
        print(f"    {p['email']}")
    print()
    print("  Login at http://localhost:3000")
    print("  API docs  http://localhost:8000/docs")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed TheraAI MongoDB database")
    parser.add_argument("--env", default="backend/.env", help="Path to .env file (default: backend/.env)")
    parser.add_argument("--wipe", action="store_true", help="Drop all collections before seeding")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be seeded without writing")
    args = parser.parse_args()

    load_env(args.env)
    asyncio.run(seed(wipe=args.wipe, dry_run=args.dry_run))
