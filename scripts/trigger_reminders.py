#!/usr/bin/env python3
"""
Manually trigger the appointment reminder scheduler job.

Useful for testing without waiting for the hourly cron tick.
The job sends email + FCM push to patients with appointments
in the next 23-25 hours where reminder_sent=False.

Usage:
    python scripts/trigger_reminders.py
    python scripts/trigger_reminders.py --env backend/.env
    python scripts/trigger_reminders.py --dry-run   # show who would be notified
"""

import asyncio
import argparse
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))


def load_env(env_path: str):
    path = Path(env_path)
    if not path.exists():
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


async def run(dry_run: bool):
    from datetime import datetime, timezone, timedelta
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("MONGODB_DATABASE", "theraai_dev")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    now = datetime.now(timezone.utc)
    window_start = now + timedelta(hours=23)
    window_end = now + timedelta(hours=25)

    cursor = db.appointments.find({
        "status": "scheduled",
        "reminder_sent": False,
        "scheduled_at": {"$gte": window_start, "$lte": window_end},
    })

    appointments = await cursor.to_list(length=None)

    if not appointments:
        print("[info] No appointments in the 23-25h reminder window.")
        client.close()
        return

    print(f"[info] Found {len(appointments)} appointment(s) to remind:")

    for appt in appointments:
        patient = await db.users.find_one({"_id": appt["patient_id"]}) if False else \
                  await db.users.find_one({"email": {"$exists": True}, "_id": {"$exists": True}})

        # Fetch actual patient and therapist
        from bson import ObjectId
        patient = await db.users.find_one({"_id": ObjectId(appt["patient_id"])})
        therapist = await db.users.find_one({"_id": ObjectId(appt["therapist_id"])})

        patient_name = patient.get("full_name", "Patient") if patient else "Patient"
        patient_email = patient.get("email") if patient else None
        therapist_name = therapist.get("full_name", "Therapist") if therapist else "Therapist"

        print(f"  - {patient_name} <{patient_email}> → appt at {appt['scheduled_at'].strftime('%Y-%m-%d %H:%M UTC')}")

        if dry_run:
            continue

        # Send email
        try:
            from app.services.email_service import EmailService
            if patient_email:
                await EmailService.send_appointment_reminder(
                    to=patient_email,
                    patient_name=patient_name,
                    therapist_name=therapist_name,
                    scheduled_at=appt["scheduled_at"],
                )
                print(f"    [email] sent to {patient_email}")
        except Exception as e:
            print(f"    [email] failed: {e}")

        # Send FCM
        try:
            from app.services.notification_service import NotificationService
            await NotificationService.send_to_user(
                user_id=appt["patient_id"],
                title="Appointment Reminder",
                body=f"You have a session with {therapist_name} in ~24 hours.",
                data={"type": "reminder", "appointment_id": str(appt["_id"])},
            )
            print(f"    [fcm]   sent to user_id={appt['patient_id']}")
        except Exception as e:
            print(f"    [fcm]   failed: {e}")

        # Mark as sent
        await db.appointments.update_one(
            {"_id": appt["_id"]},
            {"$set": {"reminder_sent": True}},
        )
        print(f"    [db]    reminder_sent=True")

    client.close()

    if dry_run:
        print("\n[dry-run] No changes made. Remove --dry-run to actually send reminders.")
    else:
        print(f"\n[ok] Processed {len(appointments)} reminder(s).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Trigger appointment reminders manually")
    parser.add_argument("--env", default="backend/.env", help="Path to .env file")
    parser.add_argument("--dry-run", action="store_true", help="Print appointments without sending")
    args = parser.parse_args()

    load_env(args.env)
    asyncio.run(run(dry_run=args.dry_run))
