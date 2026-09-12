from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from authlib.integrations.flask_client import OAuth

db = SQLAlchemy()
login_manager = LoginManager()
oauth = OAuth()

# Flask-Limiter is optional so the app still boots if the package isn't
# installed in a given environment (e.g. a Vercel build that missed it).
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address

    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=["200 per hour", "30 per minute"],
        storage_uri="memory://",
    )
    LIMITER_AVAILABLE = True
except ImportError:  # pragma: no cover
    LIMITER_AVAILABLE = False

    class _NoOpLimiter:
        """Drop-in stand-in when flask_limiter is missing."""

        def init_app(self, app):
            return None

        def limit(self, *args, **kwargs):
            def decorator(fn):
                return fn

            return decorator

    limiter = _NoOpLimiter()
