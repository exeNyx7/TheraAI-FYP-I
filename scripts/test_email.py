#!/usr/bin/env python3
"""
Test the email service by sending a sample appointment reminder.

Usage:
    python scripts/test_email.py
    python scripts/test_email.py --to your@email.com
    python scripts/test_email.py --env backend/.env
"""

import asyncio
import argparse
import sys
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))


def load_env(env_path: str):
    path = Path(env_path)
    if not path.exists():
        print(f"[warn] .env not found at {path}")
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


async def run(to_email: str):
    from app.services.email_service import EmailService
    from app.config import get_settings

    settings = get_settings()

    if not settings.mail_enabled:
        print("[error] MAIL_ENABLED is False in your .env")
        print("        Set MAIL_ENABLED=True and configure SMTP_USERNAME/SMTP_PASSWORD first.")
        return

    scheduled_at = datetime.now(timezone.utc) + timedelta(hours=24)

    print(f"[info] Sending test reminder to: {to_email}")
    print(f"[info] SMTP host: {settings.smtp_host}:{settings.smtp_port}")

    sent = await EmailService.send_appointment_reminder(
        to_email=to_email,
        patient_name="Test Patient",
        therapist_name="Dr. Test Therapist",
        scheduled_at=scheduled_at,
    )

    if sent:
        print("[ok] Email sent successfully! Check your inbox.")
    else:
        print("[error] Email was not sent. Check MAIL_ENABLED/SMTP credentials and backend logs.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test TheraAI email service")
    parser.add_argument("--to", default=None, help="Recipient email (defaults to SMTP_USERNAME)")
    parser.add_argument("--env", default="backend/.env", help="Path to .env file")
    args = parser.parse_args()

    load_env(args.env)

    recipient = args.to or os.environ.get("SMTP_USERNAME")
    if not recipient:
        print("[error] Provide --to <email> or set SMTP_USERNAME in .env")
        sys.exit(1)

    asyncio.run(run(recipient))
