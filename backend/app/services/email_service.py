"""
Email Service for TheraAI
SMTP-based transactional email using aiosmtplib
"""

import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending transactional emails"""

    @staticmethod
    async def send_email(to_email: str, subject: str, html_body: str) -> bool:
        """Send a generic HTML email. Returns True on success."""
        settings = get_settings()

        if not getattr(settings, 'mail_enabled', False):
            logger.info(f"[EMAIL DISABLED] Would send '{subject}' to {to_email}")
            return False

        if not settings.smtp_username or not settings.smtp_password:
            logger.warning("SMTP credentials not configured — email not sent")
            return False

        try:
            import aiosmtplib

            msg = MIMEMultipart("alternative")
            msg["From"] = settings.from_email
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_username,
                password=settings.smtp_password,
                use_tls=settings.smtp_port == 465,
                start_tls=settings.smtp_port == 587,
            )
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    @staticmethod
    async def send_appointment_reminder(
        to_email: str,
        patient_name: str,
        therapist_name: str,
        scheduled_at: datetime,
    ) -> bool:
        """Send a 24-hour appointment reminder to the patient."""
        subject = f"Reminder: Therapy session tomorrow with {therapist_name}"
        formatted_time = scheduled_at.strftime("%B %d, %Y at %I:%M %p UTC")
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">TheraAI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Appointment Reminder</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <p>Hi <strong>{patient_name}</strong>,</p>
                <p>This is a friendly reminder that you have a therapy session scheduled for:</p>
                <div style="background: white; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">{formatted_time}</p>
                    <p style="margin: 5px 0 0; color: #666;">with {therapist_name}</p>
                </div>
                <p>Please make sure you're in a quiet, private space before your session begins.</p>
                <p style="color: #888; font-size: 13px; margin-top: 30px;">If you need to cancel or reschedule, please do so at least 24 hours in advance through the TheraAI app.</p>
                <p style="color: #888; font-size: 13px;">Need immediate support? Contact a crisis line: <strong>988 (US)</strong> or <strong>116 123 (UK)</strong></p>
            </div>
        </div>
        """
        return await EmailService.send_email(to_email, subject, html)

    @staticmethod
    async def send_welcome_email(to_email: str, full_name: str) -> bool:
        """Send a welcome email to a new user."""
        subject = "Welcome to TheraAI — Your mental wellness journey begins"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">Welcome to TheraAI</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <p>Hi <strong>{full_name}</strong>,</p>
                <p>Welcome to TheraAI — your AI-powered mental wellness companion.</p>
                <p>Here's what you can do to get started:</p>
                <ul style="line-height: 2;">
                    <li>📓 Write your first <strong>journal entry</strong></li>
                    <li>😊 Log your <strong>daily mood</strong></li>
                    <li>💬 Chat with your <strong>AI wellness companion</strong></li>
                    <li>📋 Take a <strong>mental health assessment</strong></li>
                    <li>📅 Book a session with a <strong>therapist</strong></li>
                </ul>
                <p>We're here for you every step of the way.</p>
                <p style="color: #888; font-size: 13px; margin-top: 30px;">In a crisis? Contact: <strong>988 (US)</strong> · <strong>116 123 (UK)</strong> · <strong>1800-599-0019 (PK)</strong></p>
            </div>
        </div>
        """
        return await EmailService.send_email(to_email, subject, html)

    @staticmethod
    async def send_appointment_confirmation(
        to_email: str,
        patient_name: str,
        therapist_name: str,
        scheduled_at: datetime,
    ) -> bool:
        """Send booking confirmation email to a patient."""
        subject = f"Appointment confirmed with {therapist_name}"
        formatted_time = scheduled_at.strftime("%B %d, %Y at %I:%M %p UTC")
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">Appointment Confirmed ✓</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <p>Hi <strong>{patient_name}</strong>,</p>
                <p>Your therapy session has been successfully booked!</p>
                <div style="background: white; border-left: 4px solid #22c55e; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">{formatted_time}</p>
                    <p style="margin: 5px 0 0; color: #666;">with {therapist_name}</p>
                </div>
                <p>You'll receive a reminder 24 hours before your session.</p>
                <p style="color: #888; font-size: 13px; margin-top: 30px;">Need to cancel? You can do so through the TheraAI app at least 24 hours in advance.</p>
            </div>
        </div>
        """
        return await EmailService.send_email(to_email, subject, html)

    @staticmethod
    async def send_crisis_alert(
        to_email: str,
        therapist_name: str,
        patient_name: str,
        severity: str,
        trigger: str,
    ) -> bool:
        """Notify a therapist of a crisis detection event."""
        subject = f"[TheraAI ALERT] Crisis detected for patient {patient_name}"
        severity_color = {"low": "#f59e0b", "medium": "#f97316", "high": "#ef4444", "critical": "#7f1d1d"}.get(severity, "#ef4444")
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {severity_color}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">⚠️ Crisis Alert</h1>
                <p style="color: white; text-transform: uppercase; font-weight: bold;">{severity.upper()} SEVERITY</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <p>Hi <strong>{therapist_name}</strong>,</p>
                <p>A crisis event has been detected for your patient <strong>{patient_name}</strong>.</p>
                <div style="background: white; border-left: 4px solid {severity_color}; padding: 15px 20px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; font-weight: bold; color: #333;">Trigger: {trigger}</p>
                </div>
                <p>Please review the patient's recent activity in your TheraAI dashboard and consider reaching out.</p>
                <p style="color: #888; font-size: 13px; margin-top: 30px;">This is an automated alert from the TheraAI crisis detection system.</p>
            </div>
        </div>
        """
        return await EmailService.send_email(to_email, subject, html)
