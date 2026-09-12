import os
import smtplib
from email.mime.text import MIMEText

import requests

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def _send_via_brevo(to_email: str, subject: str, body: str) -> bool:
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        return False

    sender_email = os.getenv("BREVO_SENDER_EMAIL") or os.getenv("SMTP_FROM") or "no-reply@aether.local"
    sender_name = os.getenv("BREVO_SENDER_NAME", "Aether")

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    try:
        res = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
        if res.status_code >= 300:
            print(f"[mailer] Brevo API error {res.status_code}: {res.text}")
            return False
        return True
    except Exception as exc:
        print(f"[mailer] Brevo API request failed: {exc}")
        return False

def _send_via_smtp(to_email: str, subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", user or "no-reply@aether.local")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"

    if not host or not user or not password:
        return False

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            if use_tls:
                server.starttls()
            server.login(user, password)
            server.sendmail(sender, [to_email], msg.as_string())
        return True
    except Exception as exc:
        print(f"[mailer] Failed to send email via SMTP to {to_email}: {exc}")
        return False

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email.

    Tries, in order: Brevo's transactional email API (BREVO_API_KEY), then
    raw SMTP (SMTP_HOST/USER/PASSWORD), then falls back to printing the
    email to the console -- handy for local dev with nothing configured.
    """
    if _send_via_brevo(to_email, subject, body):
        return True

    if _send_via_smtp(to_email, subject, body):
        return True

    print(f"[mailer] No email provider configured. Would send to {to_email}:\n{subject}\n{body}")
    return True

def send_otp_email(to_email: str, otp_code: str) -> bool:
    subject = "Your Aether password reset code"
    body = (
        f"Your Aether verification code is: {otp_code}\n\n"
        "This code expires in 10 minutes. If you didn't request a password "
        "reset, you can safely ignore this email."
    )
    return send_email(to_email, subject, body)
