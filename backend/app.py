import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db, login_manager, oauth, limiter
from models import User
from auth_routes import auth_bp
from chat_routes import chat_bp

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is required. "
        'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
    )

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5000").rstrip("/")
IS_PRODUCTION = os.getenv("FLASK_ENV", "").lower() == "production"

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config["SECRET_KEY"] = SECRET_KEY
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = IS_PRODUCTION
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["REMEMBER_COOKIE_SECURE"] = IS_PRODUCTION
app.config["REMEMBER_COOKIE_HTTPONLY"] = True

CORS(
    app,
    supports_credentials=True,
    origins=[FRONTEND_URL, "http://localhost:5000", "http://127.0.0.1:5000"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

limiter.init_app(app)

db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = None
login_manager.session_protection = "strong"

oauth.init_app(app)
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, user_id)

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Unauthorized"}), 401

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Too many requests. Please try again later."}), 429

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)

@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "login.html")

@app.get("/<path:filename>")
def frontend_files(filename):
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(FRONTEND_DIR, filename)

with app.app_context():
    db.create_all()
    from sqlalchemy import text

    with db.engine.connect() as conn:
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments TEXT"))
        conn.commit()

if __name__ == "__main__":
    debug = not IS_PRODUCTION and os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=debug, threaded=True)
