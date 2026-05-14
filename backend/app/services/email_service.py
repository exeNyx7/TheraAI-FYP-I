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

# ── Brand (matches landing page CSS) ─────────────────────────────────────────
_PURPLE   = "#667eea"          # primary accent
_BG       = "#f5f7fa"          # hero section background
_CRISIS_LINE = "0317-4288665 (Umang, Pakistan)"


def _base_template(subtitle: str, body_html: str, header_bg: str = _PURPLE) -> str:
    """
    Email-safe table layout.
    • bgcolor on <td> = Outlook solid fallback
    • All CSS inline — no <style> block (Gmail strips it)
    • max-width 600 px, fluid on mobile
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TheraAI</title>
</head>
<body style="margin:0;padding:0;background-color:{_BG};
             font-family:Arial,Helvetica,sans-serif;">

<!--[if mso]>
<table width="100%" bgcolor="{_BG}" cellpadding="0" cellspacing="0">
<tr><td align="center">
<![endif]-->

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:{_BG};padding:36px 16px;">
<tr><td align="center" valign="top">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="max-width:600px;border-radius:16px;overflow:hidden;
                box-shadow:0 8px 40px rgba(102,126,234,0.15);">

    <!-- ── Header ─── -->
    <tr>
      <td bgcolor="{header_bg}" align="center"
          style="background-color:{header_bg};padding:44px 32px 36px;">
        <p style="margin:0;font-size:36px;font-weight:800;
                  color:#ffffff;letter-spacing:-0.5px;line-height:1;">
          TheraAI
        </p>
        <p style="margin:10px 0 0;font-size:14px;font-weight:500;
                  color:rgba(255,255,255,0.80);letter-spacing:2px;
                  text-transform:uppercase;">
          Talk. Track. Heal.
        </p>
        <div style="width:40px;height:3px;background:rgba(255,255,255,0.35);
                    border-radius:2px;margin:18px auto 0;"></div>
        <p style="margin:14px 0 0;font-size:15px;font-weight:600;
                  color:rgba(255,255,255,0.92);letter-spacing:0.2px;">
          {subtitle}
        </p>
      </td>
    </tr>

    <!-- ── Body ─── -->
    <tr>
      <td bgcolor="#ffffff"
          style="background-color:#ffffff;padding:40px 36px;
                 color:#1a202c;font-size:15px;line-height:1.8;">
        {body_html}
      </td>
    </tr>

    <!-- ── Footer ─── -->
    <tr>
      <td bgcolor="{_BG}"
          style="background-color:{_BG};padding:20px 36px;
                 text-align:center;border-top:1px solid #e8eef5;">
        <p style="margin:0 0 6px;font-size:13px;color:#718096;">
          &copy; 2025 <strong style="color:{_PURPLE};">TheraAI</strong>
          &nbsp;&middot;&nbsp; Pakistan
        </p>
        <p style="margin:0;font-size:12px;color:#a0aec0;">
          Need immediate help? Call
          <strong style="color:#4a5568;">{_CRISIS_LINE}</strong>
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>"""


def _highlight_box(main_text: str, sub_text: str = "", accent: str = _PURPLE) -> str:
    sub = (f'<p style="margin:6px 0 0;font-size:13px;color:#718096;">{sub_text}</p>'
           if sub_text else "")
    return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:24px 0;border-radius:10px;overflow:hidden;">
  <tr>
    <td bgcolor="#f0f0ff" style="background-color:#f0f0ff;
        border-left:4px solid {accent};padding:16px 20px;border-radius:0 10px 10px 0;">
      <p style="margin:0;font-size:17px;font-weight:700;color:#1a202c;">{main_text}</p>
      {sub}
    </td>
  </tr>
</table>"""


def _divider() -> str:
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'border="0" style="margin:24px 0;">'
        '<tr><td style="border-top:1px solid #e8eef5;font-size:0;line-height:0;">'
        '&nbsp;</td></tr></table>'
    )


class EmailService:
    """Service for sending transactional emails"""

    @staticmethod
    async def send_email(to_email: str, subject: str, html_body: str) -> bool:
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

    # ── Templates ─────────────────────────────────────────────────────────────

    @staticmethod
    async def send_otp_email(to_email: str, otp: str) -> bool:
        subject = "TheraAI — Your password reset code"
        body = f"""
<p style="margin:0 0 14px;color:#4a5568;">
  You requested a password reset for your <strong>TheraAI</strong> account.
</p>
<p style="margin:0 0 24px;color:#4a5568;">
  Enter the 6-digit code below. It expires in <strong>15 minutes</strong>.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 28px;">
  <tr>
    <td align="center" bgcolor="#f0f0ff"
        style="background-color:#f0f0ff;border:2px solid {_PURPLE};
               border-radius:12px;padding:24px 0;">
      <span style="font-size:42px;font-weight:800;letter-spacing:16px;
                   color:{_PURPLE};font-family:Courier New,monospace;">
        {otp}
      </span>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#a0aec0;">
  If you didn&apos;t request this, ignore this email — your account remains secure.
</p>"""
        return await EmailService.send_email(
            to_email, subject, _base_template("Password Reset", body)
        )

    @staticmethod
    async def send_welcome_email(to_email: str, full_name: str) -> bool:
        subject = "Welcome to TheraAI — Your wellness journey starts now"
        body = f"""
<p style="margin:0 0 8px;font-size:16px;color:#1a202c;">
  Hi <strong>{full_name}</strong>, welcome aboard! &#127881;
</p>
<p style="margin:0 0 24px;color:#4a5568;">
  You&apos;re now part of <strong>TheraAI</strong> — a safe space to talk,
  track your mental health, and heal at your own pace.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 28px;">
  <tr>
    <td bgcolor="#f0f0ff" style="background-color:#f0f0ff;border-radius:12px;
        padding:24px 28px;border-left:4px solid {_PURPLE};">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;
                color:{_PURPLE};text-transform:uppercase;letter-spacing:0.5px;">
        Get started in minutes
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#2d3748;">
          &#128211;&nbsp; Write your first <strong>journal entry</strong>
        </td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#2d3748;">
          &#128522;&nbsp; Log your <strong>daily mood</strong>
        </td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#2d3748;">
          &#128172;&nbsp; Chat with your <strong>AI wellness companion</strong>
        </td></tr>
        <tr><td style="padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#2d3748;">
          &#128203;&nbsp; Take a <strong>mental health assessment</strong>
        </td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#2d3748;">
          &#128197;&nbsp; Book a session with a <strong>licensed therapist</strong>
        </td></tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:0;color:#4a5568;">
  We&apos;re with you every step of the way. &#128149;
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template("Your mental wellness journey begins", body)
        )

    @staticmethod
    async def send_appointment_confirmation(
        to_email: str,
        patient_name: str,
        therapist_name: str,
        scheduled_at: datetime,
    ) -> bool:
        subject = f"Appointment confirmed with {therapist_name}"
        formatted = scheduled_at.strftime("%A, %B %d %Y &nbsp;&#183;&nbsp; %I:%M %p UTC")
        body = f"""
<p style="margin:0 0 8px;color:#1a202c;">Hi <strong>{patient_name}</strong>,</p>
<p style="margin:0 0 24px;color:#4a5568;">
  Your therapy session is <strong style="color:#22c55e;">confirmed</strong>. &#10003;
</p>
{_highlight_box(formatted, f"with {therapist_name}", "#22c55e")}
<p style="margin:0 0 14px;color:#4a5568;">
  You&apos;ll receive a reminder 24 hours before your session.
  Please be in a <strong>quiet, private space</strong> when you join.
</p>
{_divider()}
<p style="margin:0;font-size:13px;color:#a0aec0;">
  Need to cancel? Please do so at least 24 hours in advance through the TheraAI app.
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template("Appointment Confirmed &#10003;", body)
        )

    @staticmethod
    async def send_appointment_reminder(
        to_email: str,
        patient_name: str,
        therapist_name: str,
        scheduled_at: datetime,
    ) -> bool:
        subject = f"Reminder: Session with {therapist_name} is tomorrow"
        formatted = scheduled_at.strftime("%A, %B %d %Y &nbsp;&#183;&nbsp; %I:%M %p UTC")
        body = f"""
<p style="margin:0 0 8px;color:#1a202c;">Hi <strong>{patient_name}</strong>,</p>
<p style="margin:0 0 24px;color:#4a5568;">
  Your therapy session is <strong>tomorrow</strong>. Here&apos;s a quick reminder:
</p>
{_highlight_box(formatted, f"with {therapist_name}")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 24px;">
  <tr>
    <td bgcolor="#f0f0ff" style="background-color:#f0f0ff;border-radius:10px;padding:16px 20px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:{_PURPLE};">
        Before your session
      </p>
      <p style="margin:0;font-size:13px;color:#4a5568;line-height:1.7;">
        &#10003;&nbsp; Find a quiet, private space<br/>
        &#10003;&nbsp; Test your internet connection<br/>
        &#10003;&nbsp; Have water nearby
      </p>
    </td>
  </tr>
</table>
{_divider()}
<p style="margin:0;font-size:13px;color:#a0aec0;">
  Need to reschedule? Please do so at least 24 hours in advance through the TheraAI app.
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template("Session Reminder &#8203;&#128197;", body)
        )

    @staticmethod
    async def send_crisis_alert(
        to_email: str,
        therapist_name: str,
        patient_name: str,
        severity: str,
        trigger: str,
    ) -> bool:
        subject = f"[TheraAI Alert] Crisis signal — {patient_name}"
        sev_colors = {"moderate": "#f59e0b", "high": "#f97316", "emergency": "#ef4444"}
        sev_color = sev_colors.get(severity, "#ef4444")
        sev_emoji = {"moderate": "&#9889;", "high": "&#9888;&#65039;",
                     "emergency": "&#128680;"}.get(severity, "&#9888;&#65039;")
        sev_label = severity.upper()
        body = f"""
<p style="margin:0 0 8px;color:#1a202c;">Hi <strong>{therapist_name}</strong>,</p>
<p style="margin:0 0 24px;color:#4a5568;">
  TheraAI&apos;s crisis detection has flagged a concern for patient
  <strong>{patient_name}</strong>. Please review and reach out if appropriate.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 24px;border-radius:12px;overflow:hidden;">
  <tr>
    <td bgcolor="#fff5f5" style="background-color:#fff5f5;
        border-left:5px solid {sev_color};padding:18px 22px;border-radius:0 12px 12px 0;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:{sev_color};">
        {sev_emoji}&nbsp; {sev_label} SEVERITY
      </p>
      <p style="margin:0;font-size:13px;color:#718096;font-style:italic;">
        Trigger: &ldquo;{trigger}&rdquo;
      </p>
    </td>
  </tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 24px;">
  <tr>
    <td bgcolor="#f0f0ff" style="background-color:#f0f0ff;border-radius:10px;padding:16px 20px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:{_PURPLE};">
        Recommended next steps
      </p>
      <p style="margin:0;font-size:13px;color:#4a5568;line-height:1.7;">
        &#10003;&nbsp; Review the patient&apos;s recent journal and chat activity<br/>
        &#10003;&nbsp; Consider reaching out directly via the app<br/>
        &#10003;&nbsp; If immediate risk — contact emergency services
      </p>
    </td>
  </tr>
</table>
{_divider()}
<p style="margin:0;font-size:13px;color:#a0aec0;">
  Automated alert from TheraAI crisis detection.
  Log in to your dashboard to acknowledge this escalation.
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template(f"{sev_emoji} Crisis Alert &mdash; {sev_label}", body, sev_color)
        )

    @staticmethod
    async def send_subscription_welcome(
        to_email: str,
        patient_name: str,
        plan_name: str,
        sessions_count: int,
        renewal_date=None,
    ) -> bool:
        subject = f"Welcome to TheraAI {plan_name}! Your journey starts now"
        renewal_row = (
            f'<tr><td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#4a5568;">'
            f'<strong>Renews</strong></td>'
            f'<td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#2d3748;">'
            f'{renewal_date}</td></tr>'
        ) if renewal_date else ""
        body = f"""
<p style="margin:0 0 8px;color:#1a202c;">Hi <strong>{patient_name}</strong>,</p>
<p style="margin:0 0 24px;color:#4a5568;">
  Thank you for joining the <strong>TheraAI</strong> family! Your <strong>{plan_name}</strong>
  plan is now active and ready to go.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 24px;border-radius:10px;overflow:hidden;border:1px solid #e8eef5;">
  <tr style="background-color:#f8fafd;">
    <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;
               color:{_PURPLE};text-transform:uppercase;letter-spacing:0.5px;">Plan Details</th>
  </tr>
  <tr>
    <td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#4a5568;"><strong>Plan</strong></td>
    <td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#2d3748;">{plan_name}</td>
  </tr>
  <tr>
    <td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#4a5568;"><strong>Sessions</strong></td>
    <td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#2d3748;">{sessions_count} per month</td>
  </tr>
  {renewal_row}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 24px;">
  <tr>
    <td bgcolor="#f0fff4" style="background-color:#f0fff4;border-radius:10px;padding:16px 20px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#22c55e;">
        What&apos;s next?
      </p>
      <p style="margin:0;font-size:13px;color:#4a5568;line-height:1.9;">
        &#128197;&nbsp; <strong>Book your first session</strong> — visit Appointments<br/>
        &#128172;&nbsp; <strong>Chat with your AI companion</strong> — available 24/7<br/>
        &#128203;&nbsp; <strong>Take an assessment</strong> — track your mental health<br/>
        &#128221;&nbsp; <strong>Write in your diary</strong> — express yourself freely
      </p>
    </td>
  </tr>
</table>
<p style="margin:0;color:#4a5568;">
  We&apos;re with you every step of the way. Welcome to the family. &#128149;
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template(f"Welcome to {plan_name} &#127881;", body)
        )

    @staticmethod
    async def send_payment_receipt(
        to_email: str,
        patient_name: str,
        therapist_name: str,
        amount_pkr: int,
        session_date=None,
    ) -> bool:
        subject = "TheraAI — Payment receipt"
        date_row = ""
        if session_date:
            if isinstance(session_date, datetime):
                date_str = session_date.strftime("%A, %B %d %Y &nbsp;&#183;&nbsp; %I:%M %p UTC")
            else:
                date_str = str(session_date)[:19]
            date_row = (
                f'<tr><td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#4a5568;">'
                f'Date</td><td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#2d3748;">'
                f'{date_str}</td></tr>'
            )
        body = f"""
<p style="margin:0 0 8px;color:#1a202c;">Hi <strong>{patient_name}</strong>,</p>
<p style="margin:0 0 24px;color:#4a5568;">
  Your payment has been confirmed. Here is your receipt:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 0 24px;border-radius:10px;overflow:hidden;border:1px solid #e8eef5;">
  <tr style="background-color:#f8fafd;">
    <th colspan="2" style="padding:10px 16px;text-align:left;font-size:12px;font-weight:700;
               color:{_PURPLE};text-transform:uppercase;letter-spacing:0.5px;">Receipt</th>
  </tr>
  <tr>
    <td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#4a5568;">Therapist</td>
    <td style="padding:8px 16px;border-bottom:1px solid #e8eef5;font-size:14px;color:#2d3748;">{therapist_name}</td>
  </tr>
  {date_row}
  <tr>
    <td style="padding:8px 16px;font-size:14px;color:#4a5568;"><strong>Amount Paid</strong></td>
    <td style="padding:8px 16px;font-size:16px;font-weight:700;color:#22c55e;">PKR {amount_pkr:,}</td>
  </tr>
</table>
<p style="margin:0 0 14px;color:#4a5568;">
  Your session is confirmed. You&apos;ll receive a reminder 24 hours before your appointment.
</p>
{_divider()}
<p style="margin:0;font-size:13px;color:#a0aec0;">
  Need help? Contact us through the TheraAI app.
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template("Payment Receipt &#9989;", body, "#22c55e")
        )

    @staticmethod
    async def send_subscription_confirmation(
        to_email: str,
        patient_name: str,
        plan_name: str,
        sessions_count: int,
    ) -> bool:
        subject = f"TheraAI {plan_name} plan is now active"
        body = f"""
<p style="margin:0 0 8px;color:#1a202c;">Hi <strong>{patient_name}</strong>,</p>
<p style="margin:0 0 24px;color:#4a5568;">
  Your <strong>{plan_name}</strong> subscription is now active! &#127881;
</p>
{_highlight_box(f"{sessions_count} sessions available", f"{plan_name} plan", "#22c55e")}
<p style="margin:0 0 14px;color:#4a5568;">
  Head to the TheraAI app to book your sessions with a licensed therapist.
</p>
{_divider()}
<p style="margin:0;font-size:13px;color:#a0aec0;">
  Sessions reset monthly. Unused sessions do not roll over.
</p>"""
        return await EmailService.send_email(
            to_email, subject,
            _base_template("Subscription Activated &#10003;", body)
        )
