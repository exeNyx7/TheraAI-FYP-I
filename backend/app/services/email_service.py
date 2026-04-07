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
    async def send_otp_email(to_email: str, otp: str) -> bool:
        """Send a password-reset OTP email."""
        subject = "TheraAI — Your password reset code"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">TheraAI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Password Reset</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <p>You requested a password reset for your TheraAI account.</p>
                <p>Use the following 6-digit code to verify your identity. It expires in <strong>15 minutes</strong>.</p>
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #667eea;">{otp}</span>
                </div>
                <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your account remains secure.</p>
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
                    <li>Write your first <strong>journal entry</strong></li>
                    <li>Log your <strong>daily mood</strong></li>
                    <li>Chat with your <strong>AI wellness companion</strong></li>
                    <li>Take a <strong>mental health assessment</strong></li>
                    <li>Book a session with a <strong>therapist</strong></li>
                </ul>
                <p>We're here for you every step of the way.</p>
                <p style="color: #888; font-size: 13px; margin-top: 30px;">In a crisis? Contact: <strong>988 (US)</strong> · <strong>116 123 (UK)</strong> · <strong>1800-599-0019 (PK)</strong></p>
            </div>
        </div>
        """
        return await EmailService.send_email(to_email, subject, html)
