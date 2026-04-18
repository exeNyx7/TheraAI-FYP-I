"""
TheraAI — Demo Data Seed Script
================================
Creates all accounts and sample data needed for a live demo.

Usage:
    cd backend
    python -m scripts.seed_demo_data            # wipe + seed
    python -m scripts.seed_demo_data --wipe     # wipe only
    python -m scripts.seed_demo_data --no-wipe  # seed without wiping

Accounts created:
    admin@theraai.com          Admin@2024!     (admin)
    dr.ayesha.khan@theraai.com TheraAI@2024!   (psychiatrist)
    dr.usman.sheikh@theraai.com TheraAI@2024!  (psychiatrist)
    demo.patient@theraai.com   Demo@2024!      (patient — primary)
    sara.ali@theraai.com       Demo@2024!      (patient)
    omar.khan@theraai.com      Demo@2024!      (patient)
"""

import asyncio
import sys
import os
import argparse
from datetime import datetime, timezone, timedelta, date

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGODB_DATABASE", "theraai_dev")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PATIENT_PW   = "Demo@2024!"
THERAPIST_PW      = "TheraAI@2024!"
ADMIN_PW          = "Admin@2024!"

WIPE_COLLECTIONS = [
    "users", "therapist_profiles", "assessments", "assessment_results",
    "appointments", "session_notes", "treatment_plans", "sharing_preferences",
    "journals", "moods", "crisis_events", "escalations", "conversations",
    "chat_history", "chat_messages", "user_settings", "device_tokens",
    "user_memory", "notifications", "journal_entries", "mood_entries",
    "achievements", "password_reset_otps",
]

# ─────────────────────────────────────────────────────────────────────────────
# ACCOUNT DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

ADMIN = {
    "email": "admin@theraai.com",
    "full_name": "System Administrator",
    "role": "admin",
}

THERAPISTS = [
    {
        "user": {
            "email": "dr.ayesha.khan@theraai.com",
            "full_name": "Dr. Ayesha Khan",
        },
        "profile": {
            "specializations": ["Anxiety", "Depression", "CBT", "Trauma"],
            "languages": ["English", "Urdu"],
            "years_experience": 8,
            "license_number": "PMC-PSY-2016-001",
            "bio": (
                "Dr. Ayesha Khan is a certified clinical psychologist specialising in "
                "cognitive-behavioural therapy for anxiety, depression, and trauma. "
                "She holds a PhD in Clinical Psychology from the University of Karachi "
                "and has eight years of clinical experience."
            ),
            "education": [
                {"degree": "PhD Clinical Psychology", "institution": "University of Karachi", "year": 2016},
                {"degree": "MPhil Psychology",        "institution": "University of Karachi", "year": 2012},
            ],
            "session_fee": 3500,
            "currency": "PKR",
            "is_accepting_patients": True,
            "availability": [
                {"day": "Monday",    "slots": ["10:00", "11:00", "14:00", "15:00"]},
                {"day": "Wednesday", "slots": ["10:00", "11:00", "14:00", "15:00"]},
                {"day": "Friday",    "slots": ["10:00", "11:00"]},
            ],
            "rating": 4.8,
            "total_sessions": 312,
            "location": "Karachi, Pakistan",
        },
    },
    {
        "user": {
            "email": "dr.usman.sheikh@theraai.com",
            "full_name": "Dr. Usman Sheikh",
        },
        "profile": {
            "specializations": ["Stress Management", "Relationship Counselling", "Mindfulness"],
            "languages": ["English", "Urdu", "Punjabi"],
            "years_experience": 6,
            "license_number": "PMC-PSY-2018-002",
            "bio": (
                "Dr. Usman Sheikh specialises in stress management, mindfulness-based therapy, "
                "and relationship counselling. He has six years of clinical experience and is "
                "known for his empathetic and culturally sensitive approach."
            ),
            "education": [
                {"degree": "MPhil Clinical Psychology", "institution": "LUMS", "year": 2018},
                {"degree": "BSc Psychology",             "institution": "LUMS", "year": 2016},
            ],
            "session_fee": 3000,
            "currency": "PKR",
            "is_accepting_patients": True,
            "availability": [
                {"day": "Tuesday",   "slots": ["09:00", "10:00", "14:00", "15:00"]},
                {"day": "Thursday",  "slots": ["09:00", "10:00", "14:00", "15:00"]},
                {"day": "Saturday",  "slots": ["10:00", "11:00"]},
            ],
            "rating": 4.7,
            "total_sessions": 218,
            "location": "Lahore, Pakistan",
        },
    },
]

PATIENTS = [
    {
        "email": "demo.patient@theraai.com",
        "full_name": "Zara Ahmed",
        "age": 26,
        "gender": "female",
        "profession": "Graphic Designer",
        "location": "Karachi, Pakistan",
        "is_primary": True,
    },
    {
        "email": "sara.ali@theraai.com",
        "full_name": "Sara Ali",
        "age": 30,
        "gender": "female",
        "profession": "Teacher",
        "location": "Lahore, Pakistan",
        "is_primary": False,
    },
    {
        "email": "omar.khan@theraai.com",
        "full_name": "Omar Khan",
        "age": 23,
        "gender": "male",
        "profession": "Student",
        "location": "Islamabad, Pakistan",
        "is_primary": False,
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def section(title: str):
    print(f"\n{'─' * 55}")
    print(f"  {title}")
    print(f"{'─' * 55}")


async def wipe(db):
    section("WIPING COLLECTIONS")
    for col in WIPE_COLLECTIONS:
        r = await db[col].delete_many({})
        print(f"  🗑  {col}: {r.deleted_count} removed")


# ─────────────────────────────────────────────────────────────────────────────
# SEED FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

async def seed_admin(db) -> str:
    section("ADMIN ACCOUNT")
    now = datetime.now(timezone.utc)
    res = await db.users.update_one(
        {"email": ADMIN["email"]},
        {
            "$set": {
                **ADMIN,
                "is_active": True, "is_verified": True, "onboarding_completed": True,
                "xp": 0, "level": 1, "streak_days": 0, "unlocked_achievements": [],
                "updated_at": now,
            },
            "$setOnInsert": {"hashed_password": pwd_context.hash(ADMIN_PW), "created_at": now},
        },
        upsert=True,
    )
    doc = await db.users.find_one({"email": ADMIN["email"]}, {"_id": 1})
    action = "Created" if res.upserted_id else "Updated"
    print(f"  ✅ {action}  {ADMIN['full_name']}  <{ADMIN['email']}>  (id={doc['_id']})")
    print(f"     Password: {ADMIN_PW}")
    return str(doc["_id"])


async def seed_therapists(db) -> list[str]:
    section("THERAPIST ACCOUNTS")
    now = datetime.now(timezone.utc)
    hpw = pwd_context.hash(THERAPIST_PW)
    ids: list[str] = []

    await db.users.create_index("email", unique=True)
    await db.therapist_profiles.create_index("user_id", unique=True)

    for entry in THERAPISTS:
        u = entry["user"]
        p = entry["profile"]
        res = await db.users.update_one(
            {"email": u["email"]},
            {
                "$set": {
                    **u, "role": "psychiatrist",
                    "is_active": True, "is_verified": True, "onboarding_completed": True,
                    "xp": 0, "level": 1, "streak_days": 0, "unlocked_achievements": [],
                    "updated_at": now,
                },
                "$setOnInsert": {"hashed_password": hpw, "created_at": now},
            },
            upsert=True,
        )
        doc = await db.users.find_one({"email": u["email"]}, {"_id": 1})
        uid = str(doc["_id"])
        ids.append(uid)

        await db.therapist_profiles.update_one(
            {"user_id": uid},
            {
                "$set": {"user_id": uid, "full_name": u["full_name"], **p, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        action = "Created" if res.upserted_id else "Updated"
        print(f"  ✅ {action}  {u['full_name']}  <{u['email']}>  (id={uid})")

    print(f"     Password: {THERAPIST_PW}")
    return ids


async def seed_patients(db) -> dict[str, str]:
    """Returns {email: user_id}"""
    section("PATIENT ACCOUNTS")
    now = datetime.now(timezone.utc)
    hpw = pwd_context.hash(DEMO_PATIENT_PW)
    result: dict[str, str] = {}

    for pt in PATIENTS:
        xp, level, streak = (120, 2, 5) if pt["is_primary"] else (0, 1, 0)
        achievements = ["first_journal", "first_mood"] if pt["is_primary"] else []
        res = await db.users.update_one(
            {"email": pt["email"]},
            {
                "$set": {
                    "email": pt["email"],
                    "full_name": pt["full_name"],
                    "role": "patient",
                    "age": pt["age"],
                    "gender": pt["gender"],
                    "profession": pt["profession"],
                    "location": pt["location"],
                    "is_active": True, "is_verified": True, "onboarding_completed": True,
                    "xp": xp, "level": level, "streak_days": streak,
                    "last_active_date": date.today().isoformat(),
                    "unlocked_achievements": achievements,
                    "updated_at": now,
                },
                "$setOnInsert": {"hashed_password": hpw, "created_at": now},
            },
            upsert=True,
        )
        doc = await db.users.find_one({"email": pt["email"]}, {"_id": 1})
        uid = str(doc["_id"])
        result[pt["email"]] = uid
        action = "Created" if res.upserted_id else "Updated"
        tag = " ← PRIMARY DEMO PATIENT" if pt["is_primary"] else ""
        print(f"  ✅ {action}  {pt['full_name']}  <{pt['email']}>{tag}  (id={uid})")

    print(f"     Password: {DEMO_PATIENT_PW}")
    return result


async def seed_primary_patient_data(db, patient_id: str, therapist_ids: list[str]):
    section("DEMO PATIENT ACTIVITY DATA")
    now = datetime.now(timezone.utc)
    t1 = therapist_ids[0]  # Dr. Ayesha Khan

    # ── Appointments ──────────────────────────────────────────────────────────
    completed_at = now - timedelta(days=7)
    tomorrow     = now + timedelta(days=1, hours=10)

    appt_completed = {
        "patient_id": patient_id, "therapist_id": t1,
        "scheduled_at": completed_at, "duration_minutes": 50, "type": "video",
        "status": "completed", "notes": "Initial assessment — patient reports anxiety and low mood.",
        "jitsi_room_name": "theraai-demo-session-001",
        "reminder_sent": True, "seed_source": "seed_demo",
        "created_at": now - timedelta(days=10), "updated_at": completed_at,
    }
    appt_upcoming = {
        "patient_id": patient_id, "therapist_id": t1,
        "scheduled_at": tomorrow, "duration_minutes": 50, "type": "video",
        "status": "confirmed", "notes": "Weekly check-in",
        "jitsi_room_name": "theraai-demo-live",
        "reminder_sent": False, "seed_source": "seed_demo",
        "created_at": now - timedelta(days=2), "updated_at": now - timedelta(days=2),
    }
    appt_docs = await db.appointments.insert_many([appt_completed, appt_upcoming])
    completed_appt_id = str(appt_docs.inserted_ids[0])
    upcoming_appt_id  = str(appt_docs.inserted_ids[1])
    print(f"  ✅ 2 appointments: 1 completed (last week), 1 confirmed (tomorrow)")
    print(f"     Live demo room: theraai-demo-live")

    # ── Session notes for completed appointment ────────────────────────────────
    await db.session_notes.insert_one({
        "appointment_id": completed_appt_id,
        "therapist_id": t1,
        "patient_id": patient_id,
        "content": (
            "Patient presented with moderate anxiety and persistent low mood for past 3 weeks. "
            "Reports disrupted sleep and difficulty concentrating at work. "
            "PHQ-9 score of 12 (moderate). GAD-7 score of 10 (moderate anxiety). "
            "Introduced CBT thought-record technique. Assigned daily mood tracking homework. "
            "Plan: weekly sessions for 8 weeks, reassess after 4 sessions."
        ),
        "homework": "Complete daily mood logs and 3 thought records.",
        "next_session_goals": "Review thought records, introduce behavioural activation.",
        "risk_level": "low",
        "created_at": completed_at + timedelta(minutes=55),
        "updated_at": completed_at + timedelta(minutes=55),
        "seed_source": "seed_demo",
    })
    print(f"  ✅ Session notes for completed appointment")

    # ── Mood logs (14 days) ────────────────────────────────────────────────────
    _INTENSITY = {"happy": 4, "excited": 5, "calm": 4, "neutral": 3, "anxious": 2, "sad": 2, "stressed": 2}
    mood_sequence = [
        (0,  "anxious",  "Feeling on edge today, hard to focus."),
        (1,  "calm",     "Morning walk helped settle my nerves."),
        (2,  "happy",    "Good therapy session yesterday still resonating."),
        (3,  "stressed", "Deadline at work — lots of pressure."),
        (4,  "neutral",  "Okay day, nothing notable."),
        (5,  "sad",      "Feeling a bit low without clear reason."),
        (6,  "calm",     "Journaling before bed helped."),
        (7,  "happy",    "Session with Dr. Khan went well!"),
        (8,  "anxious",  "Upcoming family event making me nervous."),
        (9,  "neutral",  "Managed the day well, routines holding."),
        (10, "calm",     "Breathing exercises working."),
        (11, "stressed", "Back-to-back meetings, very tired."),
        (12, "happy",    "Called a friend — felt connected."),
        (13, "neutral",  "Just an average Thursday."),
    ]
    mood_docs = [
        {
            "user_id": patient_id,
            "mood": mood, "intensity": _INTENSITY.get(mood, 3), "notes": note,
            "created_at": now - timedelta(days=d),
            "updated_at": now - timedelta(days=d),
            "seed_source": "seed_demo",
        }
        for d, mood, note in mood_sequence
    ]
    await db.moods.insert_many(mood_docs)
    print(f"  ✅ {len(mood_docs)} mood logs (14 days)")

    # ── Journal entries ────────────────────────────────────────────────────────
    journals = [
        {
            "user_id": patient_id,
            "content": (
                "Today was really hard. I kept worrying about the project presentation "
                "even though I've done everything I can. My mind just won't stop. "
                "I did the breathing exercises and it helped a little bit."
            ),
            "mood": "anxious",
            "sentiment_label": "NEGATIVE", "sentiment_score": 0.82,
            "empathy_text": "It sounds like your mind is working overtime. You're doing all the right things — the breathing exercises are a real skill.",
            "emotion_themes": ["Anxiety & Fear", "Determination"],
            "top_emotions": [{"label": "nervousness", "score": 0.78}, {"label": "realization", "score": 0.61}],
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1),
            "seed_source": "seed_demo",
        },
        {
            "user_id": patient_id,
            "content": (
                "Had a really good session with Dr. Khan today. She helped me see "
                "that a lot of my anxiety comes from catastrophic thinking — assuming "
                "the worst will happen. The thought record exercise actually made sense. "
                "Feeling hopeful that things can improve."
            ),
            "mood": "happy",
            "sentiment_label": "POSITIVE", "sentiment_score": 0.91,
            "empathy_text": "That's a powerful realisation. Catching those catastrophic thoughts is the first step to changing them — you should feel proud.",
            "emotion_themes": ["Optimism & Hope", "Gratitude & Appreciation"],
            "top_emotions": [{"label": "optimism", "score": 0.88}, {"label": "gratitude", "score": 0.74}],
            "created_at": now - timedelta(days=7, hours=-1),
            "updated_at": now - timedelta(days=7, hours=-1),
            "seed_source": "seed_demo",
        },
        {
            "user_id": patient_id,
            "content": (
                "Couldn't sleep last night. Just kept thinking about everything that "
                "could go wrong. I feel so tired all the time. Some days it feels like "
                "nothing will ever get better and I'm just going through the motions."
            ),
            "mood": "sad",
            "sentiment_label": "NEGATIVE", "sentiment_score": 0.88,
            "empathy_text": "Exhaustion mixed with hopelessness is one of the heaviest combinations. You're not alone in this — and noticing it enough to write it down is something.",
            "emotion_themes": ["Sadness & Loss", "Anxiety & Fear"],
            "top_emotions": [{"label": "sadness", "score": 0.85}, {"label": "fear", "score": 0.67}],
            "created_at": now - timedelta(days=10),
            "updated_at": now - timedelta(days=10),
            "seed_source": "seed_demo",
        },
        {
            "user_id": patient_id,
            "content": (
                "Started using the mood tracker every day this week. "
                "It's actually really helpful to see the pattern — I'm more anxious "
                "on Mondays and Wednesdays (deadline days). "
                "That's useful information. Maybe I can plan lighter Mondays."
            ),
            "mood": "neutral",
            "sentiment_label": "POSITIVE", "sentiment_score": 0.72,
            "empathy_text": "You're doing something really smart — turning your patterns into actionable insight. That's exactly what this tool is for.",
            "emotion_themes": ["Insight & Realization", "Curiosity & Interest"],
            "top_emotions": [{"label": "realization", "score": 0.80}, {"label": "curiosity", "score": 0.65}],
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=3),
            "seed_source": "seed_demo",
        },
        {
            "user_id": patient_id,
            "content": (
                "Feeling really overwhelmed today. Can't cope with everything "
                "at once. I feel hopeless and like nothing will ever change. "
                "I've been having dark thoughts and feeling like everyone would "
                "be better off without me."
            ),
            "mood": "anxious",
            "sentiment_label": "NEGATIVE", "sentiment_score": 0.96,
            "empathy_text": "These feelings are serious and real. Please reach out to Dr. Khan or a crisis line. You matter and support is available.",
            "emotion_themes": ["Sadness & Loss", "Anxiety & Fear"],
            "top_emotions": [{"label": "grief", "score": 0.82}, {"label": "fear", "score": 0.76}],
            "created_at": now - timedelta(days=5),
            "updated_at": now - timedelta(days=5),
            "seed_source": "seed_demo",
        },
    ]
    await db.journals.insert_many(journals)
    print(f"  ✅ {len(journals)} journal entries (with AI analysis)")

    # ── PHQ-9 Assessment result ────────────────────────────────────────────────
    await db.assessment_results.insert_one({
        "user_id": patient_id,
        "assessment_slug": "phq-9",
        "assessment_name": "PHQ-9 Depression Screening",
        "score": 12,
        "max_score": 27,
        "severity": "moderate",
        "label": "Moderate Depression",
        "answers": [2, 1, 2, 2, 1, 1, 1, 1, 1],
        "recommendation": (
            "Your score suggests moderate depression. We recommend speaking with a mental "
            "health professional. You can book a session with one of our therapists."
        ),
        "completed_at": now - timedelta(days=8),
        "created_at": now - timedelta(days=8),
        "seed_source": "seed_demo",
    })
    print(f"  ✅ PHQ-9 assessment result (score: 12 — Moderate Depression)")

    # ── Crisis event + escalation ─────────────────────────────────────────────
    crisis_at = now - timedelta(days=5)
    await db.crisis_events.insert_one({
        "user_id": patient_id,
        "message": "I feel hopeless and like everyone would be better off without me.",
        "severity": "high",
        "keywords_matched": ["hopeless", "better off without me"],
        "emotions_detected": ["grief", "fear"],
        "therapist_notified": True,
        "created_at": crisis_at,
        "seed_source": "seed_demo",
    })
    esc_result = await db.escalations.insert_one({
        "patient_id": patient_id,
        "severity": "high",
        "triggered_by": "ai_crisis_detection",
        "message": "I feel hopeless and like everyone would be better off without me.",
        "trigger": "hopeless, better off without me",
        "status": "open",
        "free_session_granted": False,
        "acknowledged": False,
        "created_at": crisis_at,
        "seed_source": "seed_demo",
    })
    # In-app notification for therapist
    await db.notifications.insert_one({
        "user_id": t1,
        "type": "crisis_alert",
        "title": "⚠️ Crisis Alert — HIGH",
        "body": "Patient Zara Ahmed needs attention. Trigger: hopeless, better off without me",
        "patient_id": patient_id,
        "escalation_id": str(esc_result.inserted_id),
        "severity": "high",
        "read": False,
        "created_at": crisis_at,
        "seed_source": "seed_demo",
    })
    print(f"  ✅ Crisis event + escalation (severity: HIGH) — visible on therapist dashboard")
    print(f"  ✅ In-app notification created for Dr. Ayesha Khan")

    # ── Sharing preferences ────────────────────────────────────────────────────
    await db.sharing_preferences.insert_one({
        "patient_id": patient_id,
        "therapist_id": t1,
        "share_moods": True,
        "share_journals": True,
        "share_assessments": True,
        "created_at": now - timedelta(days=8),
        "updated_at": now - timedelta(days=8),
        "seed_source": "seed_demo",
    })
    print(f"  ✅ Sharing preferences: moods + journals + assessments shared with Dr. Khan")

    # ── Treatment plan ─────────────────────────────────────────────────────────
    await db.treatment_plans.insert_one({
        "patient_id": patient_id,
        "therapist_id": t1,
        "goals": [
            "Reduce anxiety symptoms from moderate to mild within 8 weeks",
            "Establish consistent sleep routine",
            "Develop cognitive restructuring skills for catastrophic thinking",
        ],
        "interventions": ["CBT thought records", "Behavioural activation", "Sleep hygiene psychoeducation"],
        "progress_notes": "Patient engaged well in first session. Homework compliance: high.",
        "review_date": (now + timedelta(days=21)).isoformat(),
        "status": "active",
        "created_at": now - timedelta(days=7),
        "updated_at": now - timedelta(days=7),
        "seed_source": "seed_demo",
    })
    print(f"  ✅ Active treatment plan (8-week CBT programme)")

    # ── User settings ──────────────────────────────────────────────────────────
    await db.user_settings.insert_one({
        "user_id": patient_id,
        "theme": "system",
        "notification_preferences": {
            "email": True, "push": True,
            "appointments": True, "insights": True, "crisis": True,
        },
        "privacy_settings": {"share_mood_with_therapist": True},
        "created_at": now - timedelta(days=8),
        "updated_at": now - timedelta(days=1),
        "seed_source": "seed_demo",
    })


async def seed_secondary_patient_data(db, patient_ids: dict, therapist_ids: list[str]):
    """Minimal data for secondary patients — enough to appear in therapist lists."""
    section("SECONDARY PATIENT MINIMAL DATA")
    now = datetime.now(timezone.utc)
    t2 = therapist_ids[1] if len(therapist_ids) > 1 else therapist_ids[0]

    for email, label in [("sara.ali@theraai.com", "Sara Ali"), ("omar.khan@theraai.com", "Omar Khan")]:
        pid = patient_ids.get(email)
        if not pid:
            continue
        await db.appointments.insert_one({
            "patient_id": pid, "therapist_id": t2,
            "scheduled_at": now + timedelta(days=3),
            "duration_minutes": 50, "type": "video",
            "status": "confirmed",
            "jitsi_room_name": f"theraai-demo-{pid[:6]}",
            "reminder_sent": False,
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1),
            "seed_source": "seed_demo",
        })
        await db.moods.insert_many([
            {
                "user_id": pid, "mood": m, "intensity": i, "notes": n,
                "created_at": now - timedelta(days=d), "updated_at": now - timedelta(days=d),
                "seed_source": "seed_demo",
            }
            for d, m, i, n in [
                (0, "neutral", 3, ""), (1, "calm", 4, ""), (2, "anxious", 2, ""),
            ]
        ])
        print(f"  ✅ {label}: 1 upcoming appointment + 3 mood logs")


# ─────────────────────────────────────────────────────────────────────────────
# ASSESSMENTS (minimal — PHQ-9 + GAD-7 for demo flow)
# ─────────────────────────────────────────────────────────────────────────────

async def seed_assessments(db):
    section("ASSESSMENTS (PHQ-9 + GAD-7)")
    now = datetime.now(timezone.utc)

    assessments = [
        {
            "name": "PHQ-9 Depression Screening",
            "slug": "phq-9",
            "category": "clinical",
            "description": "The PHQ-9 is a validated 9-question tool to screen and measure the severity of depression.",
            "estimated_minutes": 5,
            "is_active": True,
            "questions": [
                {"id": i, "text": t, "options": [
                    {"value": 0, "label": "Not at all"},
                    {"value": 1, "label": "Several days"},
                    {"value": 2, "label": "More than half the days"},
                    {"value": 3, "label": "Nearly every day"},
                ]}
                for i, t in enumerate([
                    "Little interest or pleasure in doing things?",
                    "Feeling down, depressed, or hopeless?",
                    "Trouble falling or staying asleep, or sleeping too much?",
                    "Feeling tired or having little energy?",
                    "Poor appetite or overeating?",
                    "Feeling bad about yourself or that you are a failure?",
                    "Trouble concentrating on things?",
                    "Moving or speaking unusually slowly or being fidgety?",
                    "Thoughts that you would be better off dead or of hurting yourself?",
                ], start=1)
            ],
            "scoring": {"ranges": [
                {"min": 0,  "max": 4,  "label": "Minimal Depression",           "severity": "low"},
                {"min": 5,  "max": 9,  "label": "Mild Depression",              "severity": "medium"},
                {"min": 10, "max": 14, "label": "Moderate Depression",          "severity": "high"},
                {"min": 15, "max": 27, "label": "Moderately Severe Depression", "severity": "critical"},
            ]},
        },
        {
            "name": "GAD-7 Anxiety Screening",
            "slug": "gad-7",
            "category": "clinical",
            "description": "The GAD-7 is a 7-item validated tool for screening generalized anxiety disorder.",
            "estimated_minutes": 4,
            "is_active": True,
            "questions": [
                {"id": i, "text": t, "options": [
                    {"value": 0, "label": "Not at all"},
                    {"value": 1, "label": "Several days"},
                    {"value": 2, "label": "More than half the days"},
                    {"value": 3, "label": "Nearly every day"},
                ]}
                for i, t in enumerate([
                    "Feeling nervous, anxious, or on edge?",
                    "Not being able to stop or control worrying?",
                    "Worrying too much about different things?",
                    "Trouble relaxing?",
                    "Being so restless that it's hard to sit still?",
                    "Becoming easily annoyed or irritable?",
                    "Feeling afraid as if something awful might happen?",
                ], start=1)
            ],
            "scoring": {"ranges": [
                {"min": 0,  "max": 4,  "label": "Minimal Anxiety",  "severity": "low"},
                {"min": 5,  "max": 9,  "label": "Mild Anxiety",     "severity": "medium"},
                {"min": 10, "max": 14, "label": "Moderate Anxiety", "severity": "high"},
                {"min": 15, "max": 21, "label": "Severe Anxiety",   "severity": "critical"},
            ]},
        },
    ]

    for a in assessments:
        res = await db.assessments.update_one(
            {"slug": a["slug"]},
            {"$set": {**a, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        action = "Inserted" if res.upserted_id else "Updated"
        print(f"  ✅ {action}: {a['name']}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

async def main(do_wipe: bool, do_seed: bool):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"\n{'═' * 55}")
    print(f"  TheraAI — Demo Data Seed")
    print(f"  Database: {MONGO_URL}/{DB_NAME}")
    print(f"{'═' * 55}")

    if do_wipe:
        await wipe(db)

    if not do_seed:
        print("\n✅ Wipe complete (--wipe flag, skipping seed).")
        client.close()
        return

    await seed_assessments(db)
    await seed_admin(db)
    therapist_ids = await seed_therapists(db)
    patient_ids = await seed_patients(db)

    primary_id = patient_ids.get("demo.patient@theraai.com")
    if primary_id:
        await seed_primary_patient_data(db, primary_id, therapist_ids)
    await seed_secondary_patient_data(db, patient_ids, therapist_ids)

    print(f"\n{'═' * 55}")
    print(f"  DEMO SEED COMPLETE")
    print(f"{'═' * 55}")
    print(f"\n  Quick login reference:")
    print(f"  {'Email':<38} {'Password':<16} Role")
    print(f"  {'─'*38} {'─'*16} {'─'*12}")
    rows = [
        ("admin@theraai.com", ADMIN_PW, "admin"),
        ("dr.ayesha.khan@theraai.com", THERAPIST_PW, "psychiatrist"),
        ("dr.usman.sheikh@theraai.com", THERAPIST_PW, "psychiatrist"),
        ("demo.patient@theraai.com", DEMO_PATIENT_PW, "patient (primary)"),
        ("sara.ali@theraai.com", DEMO_PATIENT_PW, "patient"),
        ("omar.khan@theraai.com", DEMO_PATIENT_PW, "patient"),
    ]
    for email, pw, role in rows:
        print(f"  {email:<38} {pw:<16} {role}")
    print()

    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed TheraAI demo data")
    parser.add_argument("--wipe",    action="store_true", help="Wipe only, skip seeding")
    parser.add_argument("--no-wipe", action="store_true", help="Seed without wiping first")
    args = parser.parse_args()

    if args.wipe and args.no_wipe:
        print("Error: --wipe and --no-wipe are mutually exclusive")
        sys.exit(1)

    do_wipe = not args.no_wipe
    do_seed = not args.wipe

    asyncio.run(main(do_wipe=do_wipe, do_seed=do_seed))
