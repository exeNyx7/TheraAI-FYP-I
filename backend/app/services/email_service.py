"""
Email Notification Service

Sends async emails for:
- Appointment confirmations (to patient)
- Appointment reminders (to patient, 24h before)
- Crisis alerts (to therapist + admin)
- Welcome email (to new patients)

Config via env vars:
  MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, MAIL_SERVER, MAIL_PORT, MAIL_TLS, MAIL_SSL
  MAIL_ENABLED (default False — set True in production)
  ADMIN_EMAIL — receives crisis alerts
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

logger = logging.getLogger(__name__)


def _get_mail_config():
    """Lazily build ConnectionConfig to avoid import errors when mail is disabled."""
    from fastapi_mail import ConnectionConfig
    from ..config import get_settings
    s = get_settings()
    return ConnectionConfig(
        MAIL_USERNAME=s.mail_username or "",
        MAIL_PASSWORD=s.mail_password or "",
        MAIL_FROM=s.mail_from or "noreply@theraai.app",
        MAIL_PORT=s.mail_port,
        MAIL_SERVER=s.mail_server or "smtp.gmail.com",
        MAIL_FROM_NAME="TheraAI",
        MAIL_STARTTLS=s.mail_tls,
        MAIL_SSL_TLS=s.mail_ssl,
        USE_CREDENTIALS=bool(s.mail_username and s.mail_password),
        VALIDATE_CERTS=True,
    )


async def _send(to: List[str], subject: str, html: str) -> bool:
    """Send an email. Returns True on success, False on failure (never raises)."""
    try:
        from fastapi_mail import FastMail, MessageSchema, MessageType
        from ..config import get_settings
        s = get_settings()

        if not s.mail_enabled:
            logger.info("Mail disabled — skipping: %s → %s", subject, to)
            return False

        msg = MessageSchema(
            subject=subject,
            recipients=to,
            body=html,
            subtype=MessageType.html,
        )
        fm = FastMail(_get_mail_config())
        await fm.send_message(msg)
        logger.info("Email sent: '%s' → %s", subject, to)
        return True
    except Exception as e:
        logger.warning("Email send failed: %s", e)
        return False


# ── Templates ────────────────────────────────────────────────────────────────

def _base_template(title: str, content: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background:#f9fafb; margin:0; padding:0; }}
    .container {{ max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }}
    .header {{ background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 32px 24px; }}
    .header h1 {{ color:#fff; margin:0; font-size:22px; font-weight:700; }}
    .header p {{ color:rgba(255,255,255,.8); margin:4px 0 0; font-size:13px; }}
    .body {{ padding:32px; color:#374151; line-height:1.6; }}
    .body h2 {{ color:#111827; margin-top:0; font-size:18px; }}
    .info-box {{ background:#f3f4f6; border-radius:8px; padding:16px; margin:16px 0; }}
    .info-box p {{ margin:4px 0; font-size:14px; }}
    .alert-box {{ background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin:16px 0; }}
    .btn {{ display:inline-block; background:#6366f1; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; margin-top:8px; }}
    .footer {{ background:#f9fafb; padding:16px 32px; text-align:center; font-size:12px; color:#9ca3af; border-top:1px solid #e5e7eb; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TheraAI</h1>
      <p>Your AI-powered mental wellness platform</p>
    </div>
    <div class="body">
      <h2>{title}</h2>
      {content}
    </div>
    <div class="footer">
      <p>TheraAI · Mental Wellness Platform · Pakistan</p>
      <p>If you need immediate help, call Umang: 0317-4288665</p>
    </div>
  </div>
</body>
</html>
"""


# ── Public API ────────────────────────────────────────────────────────────────

class EmailService:

    @staticmethod
    async def send_appointment_confirmation(
        patient_email: str,
        patient_name: str,
        therapist_name: str,
        appointment_time: str,
        appointment_id: str,
    ) -> bool:
        content = f"""
        <p>Hi {patient_name},</p>
        <p>Your appointment has been <strong>confirmed</strong>!</p>
        <div class="info-box">
          <p><strong>Therapist:</strong> Dr. {therapist_name}</p>
          <p><strong>Date & Time:</strong> {appointment_time}</p>
          <p><strong>Booking ID:</strong> {appointment_id}</p>
        </div>
        <p>Please make sure you're in a quiet, private space for your session.</p>
        <p>If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
        <a href="https://theraai.app/appointments" class="btn">View Appointment</a>
        """
        html = _base_template("Appointment Confirmed", content)
        return await _send([patient_email], "Your TheraAI Appointment is Confirmed", html)

    @staticmethod
    async def send_appointment_reminder(
        patient_email: str,
        patient_name: str,
        therapist_name: str,
        appointment_time: str,
    ) -> bool:
        content = f"""
        <p>Hi {patient_name},</p>
        <p>This is a reminder that you have a session scheduled <strong>tomorrow</strong>.</p>
        <div class="info-box">
          <p><strong>Therapist:</strong> Dr. {therapist_name}</p>
          <p><strong>Date & Time:</strong> {appointment_time}</p>
        </div>
        <p>Tip: Spend a few minutes journaling before your session — it helps you identify what to discuss.</p>
        <a href="https://theraai.app/appointments" class="btn">View Appointment</a>
        """
        html = _base_template("Reminder: Session Tomorrow", content)
        return await _send([patient_email], "Reminder: Your Therapy Session is Tomorrow", html)

    @staticmethod
    async def send_crisis_alert(
        therapist_email: str,
        therapist_name: str,
        patient_name: str,
        patient_id: str,
        severity: str,
        message_excerpt: str,
        admin_emails: Optional[List[str]] = None,
    ) -> bool:
        severity_label = severity.upper()
        content = f"""
        <p>Hi Dr. {therapist_name},</p>
        <p>A <strong>{severity_label}</strong> crisis signal was detected in a chat session with one of your patients.</p>
        <div class="alert-box">
          <p><strong>Patient:</strong> {patient_name}</p>
          <p><strong>Severity:</strong> {severity_label}</p>
          <p><strong>Message excerpt:</strong></p>
          <p><em>"{message_excerpt[:300]}..."</em></p>
          <p><strong>Time:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        <p>Please reach out to this patient as soon as possible. If you believe they are in immediate danger,
        contact emergency services or the Umang hotline (0317-4288665).</p>
        <a href="https://theraai.app/dashboard" class="btn">View Patient Dashboard</a>
        """
        html = _base_template(f"Crisis Alert: {severity_label}", content)
        recipients = [therapist_email]
        if admin_emails:
            recipients.extend(admin_emails)
        return await _send(recipients, f"[TheraAI] Crisis Alert — {severity_label}: {patient_name}", html)

    @staticmethod
    async def send_welcome_email(
        patient_email: str,
        patient_name: str,
    ) -> bool:
        content = f"""
        <p>Hi {patient_name},</p>
        <p>Welcome to <strong>TheraAI</strong> — your AI-powered mental wellness companion!</p>
        <p>Here's what you can do to get started:</p>
        <div class="info-box">
          <p>📝 <strong>Journal</strong> — Log your thoughts and let AI analyze your mood</p>
          <p>💬 <strong>Chat</strong> — Talk to your AI wellness companion anytime</p>
          <p>📊 <strong>Assessments</strong> — Take PHQ-9, GAD-7, and other standardized tests</p>
          <p>🗓️ <strong>Appointments</strong> — Book sessions with qualified therapists</p>
        </div>
        <p>Remember: you're never alone. Help is always available.</p>
        <a href="https://theraai.app/dashboard" class="btn">Go to Dashboard</a>
        """
        html = _base_template("Welcome to TheraAI!", content)
        return await _send([patient_email], "Welcome to TheraAI — Your Wellness Journey Starts Here", html)
