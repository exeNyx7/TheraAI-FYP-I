"""
Assessment Seed Script for TheraAI
Inserts PHQ-9, GAD-7, PSS-10, WHO-5, and a custom Wellness Check into the
`assessments` collection.  Safe to re-run — uses upsert on slug.

Usage:
    cd backend
    python -m scripts.seed_assessments
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DATABASE", "theraai_dev")

ASSESSMENTS = [
    # ------------------------------------------------------------------
    # PHQ-9  (Patient Health Questionnaire — Depression)
    # ------------------------------------------------------------------
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
                {"min": 0, "max": 4, "label": "Minimal Depression", "severity": "low"},
                {"min": 5, "max": 9, "label": "Mild Depression", "severity": "medium"},
                {"min": 10, "max": 14, "label": "Moderate Depression", "severity": "high"},
                {"min": 15, "max": 19, "label": "Moderately Severe Depression", "severity": "high"},
                {"min": 20, "max": 27, "label": "Severe Depression", "severity": "critical"},
            ]
        },
    },

    # ------------------------------------------------------------------
    # GAD-7  (Generalized Anxiety Disorder)
    # ------------------------------------------------------------------
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
                {"min": 0, "max": 4, "label": "Minimal Anxiety", "severity": "low"},
                {"min": 5, "max": 9, "label": "Mild Anxiety", "severity": "medium"},
                {"min": 10, "max": 14, "label": "Moderate Anxiety", "severity": "high"},
                {"min": 15, "max": 21, "label": "Severe Anxiety", "severity": "critical"},
            ]
        },
    },

    # ------------------------------------------------------------------
    # PSS-10  (Perceived Stress Scale)
    # ------------------------------------------------------------------
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
                {"min": 0, "max": 13, "label": "Low Stress", "severity": "low"},
                {"min": 14, "max": 26, "label": "Moderate Stress", "severity": "medium"},
                {"min": 27, "max": 40, "label": "High Perceived Stress", "severity": "high"},
            ]
        },
    },

    # ------------------------------------------------------------------
    # WHO-5  (WHO Well-Being Index)
    # ------------------------------------------------------------------
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
                # Raw score 0-25; percentage = raw * 4
                {"min": 0, "max": 12, "label": "Low Well-Being (possible depression)", "severity": "high"},
                {"min": 13, "max": 17, "label": "Moderate Well-Being", "severity": "medium"},
                {"min": 18, "max": 25, "label": "Good Well-Being", "severity": "low"},
            ]
        },
    },

    # ------------------------------------------------------------------
    # Custom Wellness Check
    # ------------------------------------------------------------------
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
            {
                "id": 1,
                "text": "How would you rate your sleep quality last night?",
                "options": [
                    {"value": 0, "label": "Very poor"},
                    {"value": 1, "label": "Poor"},
                    {"value": 2, "label": "Fair"},
                    {"value": 3, "label": "Good"},
                    {"value": 4, "label": "Excellent"},
                ],
            },
            {
                "id": 2,
                "text": "How is your energy level today?",
                "options": [
                    {"value": 0, "label": "Exhausted"},
                    {"value": 1, "label": "Low"},
                    {"value": 2, "label": "Moderate"},
                    {"value": 3, "label": "High"},
                    {"value": 4, "label": "Very high"},
                ],
            },
            {
                "id": 3,
                "text": "How connected do you feel to the people around you?",
                "options": [
                    {"value": 0, "label": "Very isolated"},
                    {"value": 1, "label": "Somewhat isolated"},
                    {"value": 2, "label": "Neutral"},
                    {"value": 3, "label": "Connected"},
                    {"value": 4, "label": "Very connected"},
                ],
            },
            {
                "id": 4,
                "text": "How would you rate your overall mood today?",
                "options": [
                    {"value": 0, "label": "Very low"},
                    {"value": 1, "label": "Low"},
                    {"value": 2, "label": "Neutral"},
                    {"value": 3, "label": "Good"},
                    {"value": 4, "label": "Excellent"},
                ],
            },
            {
                "id": 5,
                "text": "How well are you managing your daily responsibilities?",
                "options": [
                    {"value": 0, "label": "Struggling significantly"},
                    {"value": 1, "label": "Struggling somewhat"},
                    {"value": 2, "label": "Managing okay"},
                    {"value": 3, "label": "Managing well"},
                    {"value": 4, "label": "Thriving"},
                ],
            },
        ],
        "scoring": {
            "ranges": [
                {"min": 0, "max": 6, "label": "Needs Attention", "severity": "high"},
                {"min": 7, "max": 12, "label": "Fair Wellness", "severity": "medium"},
                {"min": 13, "max": 20, "label": "Good Wellness", "severity": "low"},
            ]
        },
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db.assessments

    inserted = 0
    updated = 0

    for assessment in ASSESSMENTS:
        result = await collection.update_one(
            {"slug": assessment["slug"]},
            {"$set": assessment},
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
            print(f"  ✅ Inserted: {assessment['name']}")
        else:
            updated += 1
            print(f"  🔄 Updated:  {assessment['name']}")

    # Ensure indexes
    await collection.create_index("slug", unique=True)
    await collection.create_index("category")
    await collection.create_index("is_active")

    print(f"\n✅ Seeding complete — {inserted} inserted, {updated} updated.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
