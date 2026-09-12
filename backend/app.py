import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db, login_manager, oauth
from models import User
from auth_routes import auth_bp
from chat_routes import chat_bp

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.getenv("FLASK_ENV") == "production"

CORS(app, supports_credentials=True)

db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = None

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
    from flask import jsonify

    return jsonify({"error": "Unauthorized"}), 401


app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "login.html")


@app.get("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)


with app.app_context():
    db.create_all()
    from sqlalchemy import text

    with db.engine.connect() as conn:
        conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments TEXT"))
        conn.commit()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)