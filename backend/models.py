import uuid
import json
from datetime import datetime, timezone
from flask_login import UserMixin
from extensions import db

def _uid():
    return uuid.uuid4().hex

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.String, primary_key=True, default=_uid)
    name = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    google_id = db.Column(db.String(255), unique=True, nullable=True)
    image = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    conversations = db.relationship(
        "Conversation", backref="user", cascade="all, delete-orphan", lazy=True
    )

    def to_public_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "image": self.image}

class PasswordReset(db.Model):
    __tablename__ = "password_resets"

    id = db.Column(db.String, primary_key=True, default=_uid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False, index=True)
    otp_hash = db.Column(db.String(255), nullable=False)
    reset_token_hash = db.Column(db.String(255), nullable=True)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    verified = db.Column(db.Boolean, default=False, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.String, primary_key=True, default=_uid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), default="New conversation")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    messages = db.relationship(
        "Message",
        backref="conversation",
        cascade="all, delete-orphan",
        lazy=True,
        order_by="Message.created_at",
    )

    def to_summary_dict(self):
        return {"id": self.id, "title": self.title, "updatedAt": self.updated_at.isoformat()}

class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.String, primary_key=True, default=_uid)
    conversation_id = db.Column(
        db.String, db.ForeignKey("conversations.id"), nullable=False, index=True
    )
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    attachments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        created = self.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        attachments = []
        if self.attachments:
            try:
                attachments = json.loads(self.attachments)
            except (TypeError, ValueError):
                attachments = []
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "attachments": attachments,
            "createdAt": created.isoformat() if created else None,
        }