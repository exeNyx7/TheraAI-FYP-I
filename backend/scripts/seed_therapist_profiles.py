"""
Seed script: creates 4 therapist user accounts + therapist_profiles documents.
Run from the backend directory: python -m scripts.seed_therapist_profiles
"""

import asyncio
import sys
import os
from datetime import datetime, timezone
from passlib.context import CryptContext

# Ensure backend package is on path when run as a module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db_manager, get_database
from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

THERAPISTS = [
    {
        "user": {
            "email": "dr.ayesha.khan@theraai.com",
            "full_name": "Dr. Ayesha Khan",
            "role": "psychiatrist",
            "is_active": True,
            "is_verified": True,
        },
        "profile": {
            "specializations": ["Anxiety & Depression", "Cognitive Behavioral Therapy"],
            "bio": (
                "Dr. Ayesha Khan is a licensed clinical psychologist with over 12 years of "
                "experience helping patients overcome anxiety, depression, and trauma. She uses "
                "evidence-based CBT techniques to guide her patients toward lasting recovery."
            ),
            "years_experience": 12,
            "hourly_rate": 3000.0,
            "currency": "PKR",
            "rating": 4.9,
            "total_reviews": 87,
            "is_accepting_patients": True,
            "availability": {
                "monday":    [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "tuesday":   [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "wednesday": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "thursday":  [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "17:00"}],
                "friday":    [{"start": "09:00", "end": "12:00"}],
                "saturday":  [],
                "sunday":    [],
            },
        },
    },
    {
        "user": {
            "email": "dr.usman.sheikh@theraai.com",
            "full_name": "Dr. Usman Sheikh",
            "role": "psychiatrist",
            "is_active": True,
            "is_verified": True,
        },
        "profile": {
            "specializations": ["Trauma & PTSD", "Mindfulness-Based Therapy"],
            "bio": (
                "Dr. Usman Sheikh specialises in trauma-informed care and mindfulness-based "
                "cognitive therapy. With 8 years of clinical practice, he has helped hundreds "
                "of patients process difficult life events and build psychological resilience."
            ),
            "years_experience": 8,
            "hourly_rate": 2500.0,
            "currency": "PKR",
            "rating": 4.8,
            "total_reviews": 63,
            "is_accepting_patients": True,
            "availability": {
                "monday":    [{"start": "10:00", "end": "14:00"}],
                "tuesday":   [{"start": "10:00", "end": "14:00"}, {"start": "15:00", "end": "18:00"}],
                "wednesday": [],
                "thursday":  [{"start": "10:00", "end": "14:00"}, {"start": "15:00", "end": "18:00"}],
                "friday":    [{"start": "10:00", "end": "14:00"}],
                "saturday":  [{"start": "10:00", "end": "13:00"}],
                "sunday":    [],
            },
        },
    },
    {
        "user": {
            "email": "dr.sana.mirza@theraai.com",
            "full_name": "Dr. Sana Mirza",
            "role": "psychiatrist",
            "is_active": True,
            "is_verified": True,
        },
        "profile": {
            "specializations": ["Stress Management", "Relationship Counseling", "Mindfulness"],
            "bio": (
                "Dr. Sana Mirza is a counselling psychologist focused on stress management and "
                "relationship dynamics. Her integrative approach combines mindfulness, solution-"
                "focused therapy, and interpersonal techniques to help clients thrive."
            ),
            "years_experience": 15,
            "hourly_rate": 3500.0,
            "currency": "PKR",
            "rating": 4.95,
            "total_reviews": 124,
            "is_accepting_patients": True,
            "availability": {
                "monday":    [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "tuesday":   [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "wednesday": [{"start": "08:00", "end": "12:00"}],
                "thursday":  [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "friday":    [{"start": "08:00", "end": "12:00"}, {"start": "13:00", "end": "16:00"}],
                "saturday":  [],
                "sunday":    [],
            },
        },
    },
    {
        "user": {
            "email": "dr.bilal.chaudhry@theraai.com",
            "full_name": "Dr. Bilal Chaudhry",
            "role": "psychiatrist",
            "is_active": True,
            "is_verified": True,
        },
        "profile": {
            "specializations": ["Adolescent Psychology", "Family Therapy", "OCD"],
            "bio": (
                "Dr. Bilal Chaudhry is a psychiatrist with a special interest in adolescent "
                "mental health, family systems therapy, and OCD. He creates a safe and non-"
                "judgmental space for young people and families navigating mental health challenges."
            ),
            "years_experience": 10,
            "hourly_rate": 2800.0,
            "currency": "PKR",
            "rating": 4.7,
            "total_reviews": 54,
            "is_accepting_patients": True,
            "availability": {
                "monday":    [{"start": "11:00", "end": "15:00"}],
                "tuesday":   [],
                "wednesday": [{"start": "11:00", "end": "15:00"}, {"start": "16:00", "end": "19:00"}],
                "thursday":  [{"start": "11:00", "end": "15:00"}],
                "friday":    [{"start": "11:00", "end": "15:00"}, {"start": "16:00", "end": "19:00"}],
                "saturday":  [{"start": "10:00", "end": "14:00"}],
                "sunday":    [],
            },
        },
    },
]

DEFAULT_PASSWORD = "TheraAI@2024!"


async def seed():
    await db_manager.connect_to_database()
    db = await get_database()
    now = datetime.now(timezone.utc)
    hashed_pw = pwd_context.hash(DEFAULT_PASSWORD)

    for entry in THERAPISTS:
        user_data = entry["user"]
        profile_data = entry["profile"]
        email = user_data["email"]

        # Upsert user
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            user_id = str(existing_user["_id"])
            print(f"  ↩  User already exists: {email} (id={user_id})")
        else:
            result = await db.users.insert_one({
                **user_data,
                "hashed_password": hashed_pw,
                "created_at": now,
                "updated_at": now,
            })
            user_id = str(result.inserted_id)
            print(f"  ✅ Created user: {email} (id={user_id})")

        # Upsert therapist profile
        profile_doc = {
            "user_id": user_id,
            "full_name": user_data["full_name"],
            **profile_data,
            "created_at": now,
        }
        await db.therapist_profiles.update_one(
            {"user_id": user_id},
            {"$set": profile_doc},
            upsert=True,
        )
        print(f"  ✅ Upserted profile for: {user_data['full_name']}")

    await db_manager.close_database_connection()
    print("\n✅ Therapist seed complete.")
    print(f"   Default password for all therapists: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed())
