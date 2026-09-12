import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from flask import Blueprint, request, jsonify, redirect, session
from flask_login import login_user, logout_user, login_required, current_user

from extensions import db, oauth, limiter
from models import User, PasswordReset
from mailer import send_otp_email

auth_bp = Blueprint("auth", __name__)

OTP_TTL_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


SPECIAL_CHARS = set("!@#$%^&*()_+-=[]{}|;:'\",.<>/?`~\\")


def _password_strength_error(password: str) -> str | None:
    """Returns a human-readable error if the password is too weak, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isupper() for c in password):
        return "Password must include at least one uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must include at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must include at least one number."
    if not any(c in SPECIAL_CHARS for c in password):
        return "Password must include at least one special character."
    return None


@auth_bp.post("/api/register")
@limiter.limit("5 per minute")
@limiter.limit("20 per hour")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip() or None
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    if len(email) > 255 or (name and len(name) > 255):
        return jsonify({"error": "Input too long."}), 400

    strength_error = _password_strength_error(password)
    if strength_error:
        return jsonify({"error": strength_error}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with that email already exists."}), 409

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(name=name, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)
    return jsonify(user.to_public_dict()), 201


@auth_bp.post("/api/login")
@limiter.limit("10 per minute")
@limiter.limit("40 per hour")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash:
        return jsonify({"error": "That email or password doesn't match our records."}), 401

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return jsonify({"error": "That email or password doesn't match our records."}), 401

    login_user(user, remember=True)
    return jsonify(user.to_public_dict())


@auth_bp.post("/api/forgot-password")
@limiter.limit("3 per minute")
@limiter.limit("10 per hour")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    generic_ok = jsonify({"ok": True, "message": "If that email is registered, a code has been sent."})

    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal whether the account exists.
        return generic_ok

    otp_code = _generate_otp()
    reset = PasswordReset(
        user_id=user.id,
        otp_hash=_hash_code(otp_code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.session.add(reset)
    db.session.commit()

    send_otp_email(user.email, otp_code)
    return generic_ok


@auth_bp.post("/api/verify-otp")
@limiter.limit("10 per minute")
def verify_otp():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp_code = (data.get("otp") or "").strip()

    if not email or not otp_code:
        return jsonify({"error": "Email and code are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid or expired code."}), 400

    reset = (
        PasswordReset.query.filter_by(user_id=user.id, verified=False)
        .order_by(PasswordReset.created_at.desc())
        .first()
    )

    if not reset or reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return jsonify({"error": "Invalid or expired code."}), 400

    if reset.attempts >= MAX_OTP_ATTEMPTS:
        return jsonify({"error": "Too many attempts. Please request a new code."}), 400

    if reset.otp_hash != _hash_code(otp_code):
        reset.attempts += 1
        db.session.commit()
        return jsonify({"error": "Invalid or expired code."}), 400

    reset_token = secrets.token_urlsafe(32)
    reset.verified = True
    reset.reset_token_hash = _hash_code(reset_token)
    db.session.commit()

    return jsonify({"ok": True, "resetToken": reset_token})


@auth_bp.post("/api/reset-password")
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    reset_token = (data.get("resetToken") or "").strip()
    new_password = data.get("password") or ""

    if not email or not reset_token or not new_password:
        return jsonify({"error": "A new password is required."}), 400

    strength_error = _password_strength_error(new_password)
    if strength_error:
        return jsonify({"error": strength_error}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "This reset link is invalid or has expired."}), 400

    reset = (
        PasswordReset.query.filter_by(user_id=user.id, verified=True)
        .order_by(PasswordReset.created_at.desc())
        .first()
    )

    if (
        not reset
        or not reset.reset_token_hash
        or reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
        or reset.reset_token_hash != _hash_code(reset_token)
    ):
        return jsonify({"error": "This reset link is invalid or has expired."}), 400

    user.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.session.delete(reset)
    db.session.commit()

    return jsonify({"ok": True})


@auth_bp.post("/api/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True})


@auth_bp.get("/api/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(current_user.to_public_dict())


@auth_bp.patch("/api/me")
@login_required
@limiter.limit("10 per minute")
def update_profile():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if name is not None:
        name = (name or "").strip() or None
        if name and len(name) > 255:
            return jsonify({"error": "Name is too long."}), 400
        current_user.name = name
    db.session.commit()
    return jsonify(current_user.to_public_dict())


@auth_bp.post("/api/change-password")
@login_required
@limiter.limit("5 per minute")
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("currentPassword") or ""
    new_password = data.get("newPassword") or ""

    if not current_user.password_hash:
        return jsonify({"error": "This account uses Google sign-in. Set a password via forgot-password first."}), 400

    if not bcrypt.checkpw(current_password.encode(), current_user.password_hash.encode()):
        return jsonify({"error": "Current password is incorrect."}), 401

    strength_error = _password_strength_error(new_password)
    if strength_error:
        return jsonify({"error": strength_error}), 400

    current_user.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.session.commit()
    return jsonify({"ok": True})


@auth_bp.delete("/api/me")
@login_required
@limiter.limit("3 per hour")
def delete_account():
    """Permanently delete the current user and all their data."""
    user = current_user
    logout_user()
    # Cascade deletes conversations + messages via relationship
    db.session.delete(user)
    db.session.commit()
    return jsonify({"ok": True})


# --- Google OAuth ---

@auth_bp.get("/auth/google")
@limiter.limit("20 per minute")
def google_login():
    # Force the redirect_uri to match FRONTEND_URL exactly, instead of deriving
    # it from the incoming request's Host header (url_for(..., _external=True)).
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5000").rstrip("/")
    redirect_uri = f"{frontend_url}/auth/google/callback"
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.get("/auth/google/callback")
def google_callback():
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5000").rstrip("/")
    try:
        token = oauth.google.authorize_access_token()
        userinfo = token.get("userinfo") or oauth.google.userinfo()
    except Exception:
        return redirect(f"{frontend_url}/login.html?error=google_failed")

    google_id = userinfo["sub"]
    email = userinfo["email"].lower()
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        # Link to an existing email/password account if one exists, else create new
        user = User.query.filter_by(email=email).first()
        if user:
            user.google_id = google_id
            user.image = user.image or picture
            if not user.name and name:
                user.name = name
        else:
            user = User(name=name, email=email, google_id=google_id, image=picture)
            db.session.add(user)
        db.session.commit()

    login_user(user, remember=True)
    return redirect(f"{frontend_url}/chat.html")
