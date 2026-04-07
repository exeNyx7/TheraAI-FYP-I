"""
TheraAI — Comprehensive Seed Script
====================================
Wipes all collections and seeds fresh data:
  - 9 clinical/wellness assessments (PHQ-9, GAD-7, PSS-10, WHO-5, Wellness Check,
    PCL-5, DASS-21, AUDIT-C, SWLS)
  - 4 therapist accounts + profiles
  - 1 sample patient account  (patient@test.com / Test@1234)

Usage:
    cd backend
    python -m scripts.seed_all            # wipe + seed
    python -m scripts.seed_all --wipe-only # wipe only (no re-seed)
    python -m scripts.seed_all --seed-only # seed without wiping first
"""

import asyncio
import sys
import os
import argparse
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DATABASE", "theraai_dev")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─────────────────────────────────────────────────────────────────────────────
# COLLECTIONS TO WIPE
# ─────────────────────────────────────────────────────────────────────────────
WIPE_COLLECTIONS = [
    "users",
    "therapist_profiles",
    "assessments",
    "assessment_results",
    "chat_history",
    "journal_entries",
    "mood_entries",
    "appointments",
    "achievements",
    "notifications",
    "password_reset_otps",
]

# ─────────────────────────────────────────────────────────────────────────────
# ASSESSMENTS  (9 total)
# ─────────────────────────────────────────────────────────────────────────────
ASSESSMENTS = [
    # ── PHQ-9 ────────────────────────────────────────────────────────────────
    {
        "name": "PHQ-9 Depression Screening",
        "slug": "phq-9",
        "category": "clinical",
        "description": (
            "The PHQ-9 is a validated 9-question tool used to screen, diagnose, "
            "monitor, and measure the severity of depression."
        ),
        "estimated_minutes": 5,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "options": [
                    {"value": 0, "label": "Not at all"},
                    {"value": 1, "label": "Several days"},
                    {"value": 2, "label": "More than half the days"},
                    {"value": 3, "label": "Nearly every day"},
                ],
            }
            for i, text in enumerate(
                [
                    "Little interest or pleasure in doing things?",
                    "Feeling down, depressed, or hopeless?",
                    "Trouble falling or staying asleep, or sleeping too much?",
                    "Feeling tired or having little energy?",
                    "Poor appetite or overeating?",
                    "Feeling bad about yourself — or that you are a failure?",
                    "Trouble concentrating on things such as reading or watching TV?",
                    "Moving or speaking so slowly that other people could have noticed? Or so fidgety or restless?",
                    "Thoughts that you would be better off dead, or thoughts of hurting yourself?",
                ],
                start=1,
            )
        ],
        "scoring": {
            "ranges": [
                {"min": 0,  "max": 4,  "label": "Minimal Depression",            "severity": "low"},
                {"min": 5,  "max": 9,  "label": "Mild Depression",               "severity": "medium"},
                {"min": 10, "max": 14, "label": "Moderate Depression",           "severity": "high"},
                {"min": 15, "max": 19, "label": "Moderately Severe Depression",  "severity": "high"},
                {"min": 20, "max": 27, "label": "Severe Depression",             "severity": "critical"},
            ]
        },
    },
    # ── GAD-7 ────────────────────────────────────────────────────────────────
    {
        "name": "GAD-7 Anxiety Screening",
        "slug": "gad-7",
        "category": "clinical",
        "description": (
            "The GAD-7 is a 7-item validated tool for screening and assessing "
            "the severity of generalized anxiety disorder."
        ),
        "estimated_minutes": 4,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "options": [
                    {"value": 0, "label": "Not at all"},
                    {"value": 1, "label": "Several days"},
                    {"value": 2, "label": "More than half the days"},
                    {"value": 3, "label": "Nearly every day"},
                ],
            }
            for i, text in enumerate(
                [
                    "Feeling nervous, anxious, or on edge?",
                    "Not being able to stop or control worrying?",
                    "Worrying too much about different things?",
                    "Trouble relaxing?",
                    "Being so restless that it's hard to sit still?",
                    "Becoming easily annoyed or irritable?",
                    "Feeling afraid as if something awful might happen?",
                ],
                start=1,
            )
        ],
        "scoring": {
            "ranges": [
                {"min": 0,  "max": 4,  "label": "Minimal Anxiety",  "severity": "low"},
                {"min": 5,  "max": 9,  "label": "Mild Anxiety",     "severity": "medium"},
                {"min": 10, "max": 14, "label": "Moderate Anxiety", "severity": "high"},
                {"min": 15, "max": 21, "label": "Severe Anxiety",   "severity": "critical"},
            ]
        },
    },
    # ── PSS-10 ───────────────────────────────────────────────────────────────
    {
        "name": "PSS-10 Perceived Stress Scale",
        "slug": "pss-10",
        "category": "clinical",
        "description": (
            "The PSS-10 measures the degree to which situations in your life "
            "are appraised as stressful over the past month."
        ),
        "estimated_minutes": 5,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "options": [
                    {"value": 0, "label": "Never"},
                    {"value": 1, "label": "Almost never"},
                    {"value": 2, "label": "Sometimes"},
                    {"value": 3, "label": "Fairly often"},
                    {"value": 4, "label": "Very often"},
                ],
            }
            for i, text in enumerate(
                [
                    "Been upset because of something that happened unexpectedly?",
                    "Felt unable to control important things in your life?",
                    "Felt nervous and stressed?",
                    "Felt confident about your ability to handle personal problems?",
                    "Felt that things were going your way?",
                    "Found that you could not cope with all the things you had to do?",
                    "Been able to control irritations in your life?",
                    "Felt that you were on top of things?",
                    "Been angered because of things that happened outside of your control?",
                    "Felt difficulties were piling up so high that you could not overcome them?",
                ],
                start=1,
            )
        ],
        "scoring": {
            "ranges": [
                {"min": 0,  "max": 13, "label": "Low Stress",               "severity": "low"},
                {"min": 14, "max": 26, "label": "Moderate Stress",          "severity": "medium"},
                {"min": 27, "max": 40, "label": "High Perceived Stress",    "severity": "high"},
            ]
        },
    },
    # ── WHO-5 ────────────────────────────────────────────────────────────────
    {
        "name": "WHO-5 Well-Being Index",
        "slug": "who-5",
        "category": "wellness",
        "description": (
            "The WHO-5 is a short, positively worded questionnaire measuring "
            "current mental well-being over the past two weeks."
        ),
        "estimated_minutes": 2,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "options": [
                    {"value": 0, "label": "At no time"},
                    {"value": 1, "label": "Some of the time"},
                    {"value": 2, "label": "Less than half the time"},
                    {"value": 3, "label": "More than half the time"},
                    {"value": 4, "label": "Most of the time"},
                    {"value": 5, "label": "All of the time"},
                ],
            }
            for i, text in enumerate(
                [
                    "I have felt cheerful and in good spirits.",
                    "I have felt calm and relaxed.",
                    "I have felt active and vigorous.",
                    "I woke up feeling fresh and rested.",
                    "My daily life has been filled with things that interest me.",
                ],
                start=1,
            )
        ],
        "scoring": {
            "ranges": [
                {"min": 0,  "max": 12, "label": "Low Well-Being (possible depression)", "severity": "high"},
                {"min": 13, "max": 17, "label": "Moderate Well-Being",                   "severity": "medium"},
                {"min": 18, "max": 25, "label": "Good Well-Being",                       "severity": "low"},
            ]
        },
    },
    # ── TheraAI Wellness Check ────────────────────────────────────────────────
    {
        "name": "TheraAI Wellness Check",
        "slug": "wellness-check",
        "category": "wellness",
        "description": (
            "A quick daily wellness snapshot covering sleep, energy, social "
            "connection, and overall mood — designed for frequent check-ins."
        ),
        "estimated_minutes": 2,
        "is_active": True,
        "questions": [
            {"id": 1, "text": "How would you rate your sleep quality last night?",
             "options": [{"value": 0, "label": "Very poor"}, {"value": 1, "label": "Poor"}, {"value": 2, "label": "Fair"}, {"value": 3, "label": "Good"}, {"value": 4, "label": "Excellent"}]},
            {"id": 2, "text": "How is your energy level today?",
             "options": [{"value": 0, "label": "Exhausted"}, {"value": 1, "label": "Low"}, {"value": 2, "label": "Moderate"}, {"value": 3, "label": "High"}, {"value": 4, "label": "Very high"}]},
            {"id": 3, "text": "How connected do you feel to the people around you?",
             "options": [{"value": 0, "label": "Very isolated"}, {"value": 1, "label": "Somewhat isolated"}, {"value": 2, "label": "Neutral"}, {"value": 3, "label": "Connected"}, {"value": 4, "label": "Very connected"}]},
            {"id": 4, "text": "How would you rate your overall mood today?",
             "options": [{"value": 0, "label": "Very low"}, {"value": 1, "label": "Low"}, {"value": 2, "label": "Neutral"}, {"value": 3, "label": "Good"}, {"value": 4, "label": "Excellent"}]},
            {"id": 5, "text": "How well are you managing your daily responsibilities?",
             "options": [{"value": 0, "label": "Struggling significantly"}, {"value": 1, "label": "Struggling somewhat"}, {"value": 2, "label": "Managing okay"}, {"value": 3, "label": "Managing well"}, {"value": 4, "label": "Thriving"}]},
        ],
        "scoring": {
            "ranges": [
                {"min": 0,  "max": 6,  "label": "Needs Attention", "severity": "high"},
                {"min": 7,  "max": 12, "label": "Fair Wellness",   "severity": "medium"},
                {"min": 13, "max": 20, "label": "Good Wellness",   "severity": "low"},
            ]
        },
    },
    # ── PCL-5  (PTSD Checklist — DSM-5) ──────────────────────────────────────
    {
        "name": "PCL-5 PTSD Checklist",
        "slug": "pcl-5",
        "category": "clinical",
        "description": (
            "The PCL-5 is a 20-item self-report measure that assesses the 20 DSM-5 "
            "symptoms of PTSD. A score of 33 or above is a probable PTSD diagnosis."
        ),
        "estimated_minutes": 8,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "options": [
                    {"value": 0, "label": "Not at all"},
                    {"value": 1, "label": "A little bit"},
                    {"value": 2, "label": "Moderately"},
                    {"value": 3, "label": "Quite a bit"},
                    {"value": 4, "label": "Extremely"},
                ],
            }
            for i, text in enumerate(
                [
                    "Repeated, disturbing, and unwanted memories of a stressful experience?",
                    "Repeated, disturbing dreams of a stressful experience?",
                    "Suddenly feeling or acting as if a stressful experience were actually happening again (as if you were actually back there reliving it)?",
                    "Feeling very upset when something reminded you of a stressful experience?",
                    "Having strong physical reactions when something reminded you of a stressful experience (e.g., heart pounding, trouble breathing)?",
                    "Avoiding memories, thoughts, or feelings related to a stressful experience?",
                    "Avoiding external reminders of a stressful experience (e.g., people, places, conversations)?",
                    "Trouble remembering important parts of a stressful experience?",
                    "Having strong negative beliefs about yourself, other people, or the world?",
                    "Blaming yourself or someone else for a stressful experience or what happened after it?",
                    "Having strong negative feelings such as fear, horror, anger, guilt, or shame?",
                    "Loss of interest in activities that you used to enjoy?",
                    "Feeling distant or cut off from other people?",
                    "Trouble experiencing positive feelings (e.g., being unable to feel happiness or love)?",
                    "Irritable behavior, angry outbursts, or acting aggressively?",
                    "Taking too many risks or doing things that could cause you harm?",
                    "Being 'superalert' or watchful or on guard?",
                    "Feeling jumpy or easily startled?",
                    "Having difficulty concentrating?",
                    "Trouble falling or staying asleep?",
                ],
                start=1,
            )
        ],
        "scoring": {
            "ranges": [
                {"min": 0,  "max": 20, "label": "Minimal PTSD Symptoms",   "severity": "low"},
                {"min": 21, "max": 32, "label": "Moderate PTSD Symptoms",  "severity": "medium"},
                {"min": 33, "max": 50, "label": "Probable PTSD",           "severity": "high"},
                {"min": 51, "max": 80, "label": "Severe PTSD Symptoms",    "severity": "critical"},
            ]
        },
    },
    # ── DASS-21  (Depression Anxiety Stress Scales) ───────────────────────────
    {
        "name": "DASS-21 Mental Health Scale",
        "slug": "dass-21",
        "category": "clinical",
        "description": (
            "The DASS-21 is a 21-item questionnaire measuring three negative "
            "emotional states: depression, anxiety, and stress, over the past week."
        ),
        "estimated_minutes": 7,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "subscale": subscale,
                "options": [
                    {"value": 0, "label": "Did not apply to me at all"},
                    {"value": 1, "label": "Applied to me to some degree"},
                    {"value": 2, "label": "Applied to me to a considerable degree"},
                    {"value": 3, "label": "Applied to me very much"},
                ],
            }
            for i, (text, subscale) in enumerate(
                [
                    ("I found it hard to wind down.", "stress"),
                    ("I was aware of dryness of my mouth.", "anxiety"),
                    ("I couldn't seem to experience any positive feeling at all.", "depression"),
                    ("I experienced breathing difficulty (e.g., excessively rapid breathing).", "anxiety"),
                    ("I found it difficult to work up the initiative to do things.", "depression"),
                    ("I tended to over-react to situations.", "stress"),
                    ("I experienced trembling (e.g., in the hands).", "anxiety"),
                    ("I felt that I was using a lot of nervous energy.", "stress"),
                    ("I was worried about situations in which I might panic.", "anxiety"),
                    ("I felt that I had nothing to look forward to.", "depression"),
                    ("I found myself getting agitated.", "stress"),
                    ("I found it difficult to relax.", "stress"),
                    ("I felt down-hearted and blue.", "depression"),
                    ("I was intolerant of anything that kept me from getting on with what I was doing.", "stress"),
                    ("I felt I was close to panic.", "anxiety"),
                    ("I was unable to become enthusiastic about anything.", "depression"),
                    ("I felt I wasn't worth much as a person.", "depression"),
                    ("I felt that I was rather touchy.", "stress"),
                    ("I was aware of the action of my heart in the absence of physical exertion.", "anxiety"),
                    ("I felt scared without any good reason.", "anxiety"),
                    ("I felt that life was meaningless.", "depression"),
                ],
                start=1,
            )
        ],
        "scoring": {
            "note": "Multiply each subscale raw score by 2. Depression: 0-9 normal, 10-13 mild, 14-20 moderate, 21-27 severe, 28+ extremely severe. Anxiety: 0-7 normal, 8-9 mild, 10-14 moderate, 15-19 severe, 20+ extremely severe. Stress: 0-14 normal, 15-18 mild, 19-25 moderate, 26-33 severe, 34+ extremely severe.",
            "ranges": [
                {"min": 0,  "max": 28, "label": "Normal Range",         "severity": "low"},
                {"min": 29, "max": 44, "label": "Mild-Moderate Range",  "severity": "medium"},
                {"min": 45, "max": 63, "label": "Severe Range",         "severity": "high"},
            ]
        },
    },
    # ── AUDIT-C  (Alcohol Use Disorders Identification Test — Condensed) ──────
    {
        "name": "AUDIT-C Alcohol Use Screening",
        "slug": "audit-c",
        "category": "clinical",
        "description": (
            "The AUDIT-C is a 3-item alcohol screen that can identify patients "
            "who are hazardous drinkers or have active alcohol use disorders. "
            "A score of 4+ (men) or 3+ (women) indicates possible alcohol misuse."
        ),
        "estimated_minutes": 2,
        "is_active": True,
        "questions": [
            {
                "id": 1,
                "text": "How often do you have a drink containing alcohol?",
                "options": [
                    {"value": 0, "label": "Never"},
                    {"value": 1, "label": "Monthly or less"},
                    {"value": 2, "label": "2–4 times a month"},
                    {"value": 3, "label": "2–3 times a week"},
                    {"value": 4, "label": "4 or more times a week"},
                ],
            },
            {
                "id": 2,
                "text": "How many standard drinks containing alcohol do you have on a typical day when you are drinking?",
                "options": [
                    {"value": 0, "label": "1–2"},
                    {"value": 1, "label": "3–4"},
                    {"value": 2, "label": "5–6"},
                    {"value": 3, "label": "7–9"},
                    {"value": 4, "label": "10 or more"},
                ],
            },
            {
                "id": 3,
                "text": "How often do you have six or more drinks on one occasion?",
                "options": [
                    {"value": 0, "label": "Never"},
                    {"value": 1, "label": "Less than monthly"},
                    {"value": 2, "label": "Monthly"},
                    {"value": 3, "label": "Weekly"},
                    {"value": 4, "label": "Daily or almost daily"},
                ],
            },
        ],
        "scoring": {
            "ranges": [
                {"min": 0, "max": 2, "label": "Low Risk",                                            "severity": "low"},
                {"min": 3, "max": 5, "label": "Hazardous Drinking (possible alcohol misuse)",        "severity": "medium"},
                {"min": 6, "max": 8, "label": "Harmful Drinking / Possible Alcohol Use Disorder",   "severity": "high"},
                {"min": 9, "max": 12, "label": "Likely Alcohol Dependence",                         "severity": "critical"},
            ]
        },
    },
    # ── SWLS  (Satisfaction With Life Scale) ─────────────────────────────────
    {
        "name": "SWLS Satisfaction With Life Scale",
        "slug": "swls",
        "category": "wellness",
        "description": (
            "The SWLS is a 5-item scale that measures global cognitive judgments "
            "of satisfaction with one's life. It does not assess satisfaction with "
            "specific life domains such as health or finances."
        ),
        "estimated_minutes": 2,
        "is_active": True,
        "questions": [
            {
                "id": i,
                "text": text,
                "options": [
                    {"value": 1, "label": "Strongly Disagree"},
                    {"value": 2, "label": "Disagree"},
                    {"value": 3, "label": "Slightly Disagree"},
                    {"value": 4, "label": "Neither Agree nor Disagree"},
                    {"value": 5, "label": "Slightly Agree"},
                    {"value": 6, "label": "Agree"},
                    {"value": 7, "label": "Strongly Agree"},
                ],
            }
            for i, text in enumerate(
                [
                    "In most ways my life is close to my ideal.",
                    "The conditions of my life are excellent.",
                    "I am satisfied with my life.",
                    "So far I have gotten the important things I want in life.",
                    "If I could live my life over, I would change almost nothing.",
                ],
                start=1,
            )
        ],
        "scoring": {
            "ranges": [
                {"min": 5,  "max": 9,  "label": "Extremely Dissatisfied",  "severity": "critical"},
                {"min": 10, "max": 14, "label": "Dissatisfied",             "severity": "high"},
                {"min": 15, "max": 19, "label": "Slightly Dissatisfied",   "severity": "medium"},
                {"min": 20, "max": 24, "label": "Neutral",                 "severity": "low"},
                {"min": 25, "max": 29, "label": "Satisfied",               "severity": "low"},
                {"min": 30, "max": 35, "label": "Extremely Satisfied",     "severity": "low"},
            ]
        },
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# THERAPIST ACCOUNTS  (same as seed_therapist_profiles.py)
# ─────────────────────────────────────────────────────────────────────────────
THERAPIST_PASSWORD = "TheraAI@2024!"

THERAPISTS = [
    {
        "user": {"email": "dr.ayesha.khan@theraai.com", "full_name": "Dr. Ayesha Khan", "role": "psychiatrist"},
        "profile": {
            "specializations": ["Anxiety & Depression", "Cognitive Behavioral Therapy"],
            "bio": "Dr. Ayesha Khan is a licensed clinical psychologist with over 12 years of experience helping patients overcome anxiety, depression, and trauma.",
            "years_experience": 12, "hourly_rate": 3000.0, "currency": "PKR",
            "rating": 4.9, "total_reviews": 87, "is_accepting_patients": True,
            "availability": {
                "monday":    [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "tuesday":   [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "wednesday": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "thursday":  [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "friday":    [{"start": "09:00", "end": "12:00"}], "saturday": [], "sunday": [],
            },
        },
    },
    {
        "user": {"email": "dr.usman.sheikh@theraai.com", "full_name": "Dr. Usman Sheikh", "role": "psychiatrist"},
        "profile": {
            "specializations": ["Trauma & PTSD", "Mindfulness-Based Therapy"],
            "bio": "Dr. Usman Sheikh specialises in trauma-informed care and mindfulness-based cognitive therapy with 8 years of clinical practice.",
            "years_experience": 8, "hourly_rate": 2500.0, "currency": "PKR",
            "rating": 4.8, "total_reviews": 63, "is_accepting_patients": True,
            "availability": {
                "monday": [{"start": "10:00", "end": "14:00"}],
                "tuesday": [{"start": "10:00", "end": "14:00"}, {"start": "15:00", "end": "18:00"}],
                "wednesday": [], "thursday": [{"start": "10:00", "end": "14:00"}, {"start": "15:00", "end": "18:00"}],
                "friday": [{"start": "10:00", "end": "14:00"}],
                "saturday": [{"start": "10:00", "end": "13:00"}], "sunday": [],
            },
        },
    },
    {
        "user": {"email": "dr.sana.mirza@theraai.com", "full_name": "Dr. Sana Mirza", "role": "psychiatrist"},
        "profile": {
            "specializations": ["Stress Management", "Relationship Counseling", "Mindfulness"],
            "bio": "Dr. Sana Mirza is a counselling psychologist focused on stress management and relationship dynamics with 15 years of experience.",
            "years_experience": 15, "hourly_rate": 3500.0, "currency": "PKR",
            "rating": 4.95, "total_reviews": 124, "is_accepting_patients": True,
            "availability": {
                "monday": [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "tuesday": [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "wednesday": [{"start": "08:00", "end": "12:00"}],
                "thursday": [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "friday": [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "saturday": [], "sunday": [],
            },
        },
    },
    {
        "user": {"email": "dr.bilal.chaudhry@theraai.com", "full_name": "Dr. Bilal Chaudhry", "role": "psychiatrist"},
        "profile": {
            "specializations": ["Adolescent Psychology", "Family Therapy", "OCD"],
            "bio": "Dr. Bilal Chaudhry is a psychiatrist with a special interest in adolescent mental health, family systems therapy, and OCD.",
            "years_experience": 10, "hourly_rate": 2800.0, "currency": "PKR",
            "rating": 4.7, "total_reviews": 54, "is_accepting_patients": True,
            "availability": {
                "monday": [{"start": "11:00", "end": "15:00"}], "tuesday": [],
                "wednesday": [{"start": "11:00", "end": "15:00"}, {"start": "16:00", "end": "19:00"}],
                "thursday": [{"start": "11:00", "end": "15:00"}],
                "friday": [{"start": "11:00", "end": "15:00"}, {"start": "16:00", "end": "19:00"}],
                "saturday": [{"start": "10:00", "end": "14:00"}], "sunday": [],
            },
        },
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# SAMPLE PATIENT
# ─────────────────────────────────────────────────────────────────────────────
SAMPLE_PATIENT = {
    "email": "patient@test.com",
    "password": "Test@1234",
    "full_name": "Test Patient",
    "role": "patient",
}

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
        result = await db[col].delete_many({})
        print(f"  🗑  {col}: {result.deleted_count} documents removed")


async def seed_assessments(db):
    section("SEEDING ASSESSMENTS")
    inserted = updated = 0
    for a in ASSESSMENTS:
        res = await db.assessments.update_one(
            {"slug": a["slug"]}, {"$set": a}, upsert=True
        )
        if res.upserted_id:
            inserted += 1
            print(f"  ✅ Inserted: {a['name']}")
        else:
            updated += 1
            print(f"  🔄 Updated:  {a['name']}")
    await db.assessments.create_index("slug", unique=True)
    await db.assessments.create_index("category")
    print(f"\n  Total: {inserted} inserted, {updated} updated ({len(ASSESSMENTS)} assessments)")


async def seed_therapists(db):
    section("SEEDING THERAPIST ACCOUNTS")
    now = datetime.now(timezone.utc)
    hashed_pw = pwd_context.hash(THERAPIST_PASSWORD)

    for entry in THERAPISTS:
        u = entry["user"]
        p = entry["profile"]
        res = await db.users.insert_one({
            **u,
            "hashed_password": hashed_pw,
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "updated_at": now,
        })
        uid = str(res.inserted_id)
        await db.therapist_profiles.insert_one({
            "user_id": uid,
            "full_name": u["full_name"],
            **p,
            "created_at": now,
        })
        print(f"  ✅ {u['full_name']}  <{u['email']}>  (id={uid})")

    print(f"\n  Default password: {THERAPIST_PASSWORD}")


async def seed_patient(db):
    section("SEEDING SAMPLE PATIENT")
    now = datetime.now(timezone.utc)
    hashed_pw = pwd_context.hash(SAMPLE_PATIENT["password"])
    res = await db.users.insert_one({
        "email":           SAMPLE_PATIENT["email"],
        "full_name":       SAMPLE_PATIENT["full_name"],
        "role":            SAMPLE_PATIENT["role"],
        "hashed_password": hashed_pw,
        "is_active":       True,
        "created_at":      now,
        "updated_at":      now,
    })
    print(f"  ✅ {SAMPLE_PATIENT['full_name']}  <{SAMPLE_PATIENT['email']}>  (id={res.inserted_id})")
    print(f"     Password: {SAMPLE_PATIENT['password']}")


async def main(args):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"\n{'═' * 55}")
    print(f"  TheraAI Seed Script")
    print(f"  Database: {DB_NAME}  ({MONGO_URL})")
    print(f"{'═' * 55}")

    if not args.seed_only:
        await wipe(db)

    if not args.wipe_only:
        await seed_assessments(db)
        await seed_therapists(db)
        await seed_patient(db)

    print(f"\n{'═' * 55}")
    print("  Done!")
    print(f"{'═' * 55}\n")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TheraAI seed script")
    parser.add_argument("--wipe-only",  action="store_true", help="Only wipe collections, do not seed")
    parser.add_argument("--seed-only",  action="store_true", help="Seed without wiping first")
    args = parser.parse_args()
    asyncio.run(main(args))
