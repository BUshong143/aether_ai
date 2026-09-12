# Aether — Python (Flask) + HTML/CSS/JS

Same app as before, rebuilt with a Python backend and a plain HTML/CSS/JS
frontend (no build step, no framework). Flask serves both the API and the
static frontend files from one process.

- **Backend:** Flask, Flask-SQLAlchemy, Flask-Login, Authlib (Google OAuth)
- **Frontend:** plain HTML + CSS + vanilla JS (`frontend/`)
- **Database:** Neon Postgres
- **AI:** NVIDIA NIM, streamed token-by-token to the browser

## ⚠️ Rotate your keys

Same reminder as before — the NVIDIA key and Neon password were shared in
plain text in chat. Revoke/regenerate them (NVIDIA: build.nvidia.com →
API Keys. Neon: console → reset password) and put the new values in
`backend/.env`, which is gitignored.

## 1. Install

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Configure environment

`backend/.env` is already filled in with your Neon URL, a generated
`SECRET_KEY`, and your NVIDIA key. You still need to add Google OAuth
credentials.

### Important — Google redirect URI changed

Because this is now a Flask app (not the old Next.js one), the OAuth
callback path is different. In Google Cloud Console → your OAuth client
→ **Authorized redirect URIs**, use:

```
http://localhost:5000/auth/google/callback
```

And **Authorized JavaScript origins**:

```
http://localhost:5000
```

(Not `localhost:3000` and not `/api/auth/callback/google` — those were
specific to the previous Next.js version.)

Copy the resulting Client ID and Secret into `backend/.env`:

```
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## 3. Create the database tables

```bash
python3 -c "from app import app, db; app.app_context().push(); db.create_all()"
```

This creates `users`, `conversations`, and `messages` in your Neon database.

## 4. Run it

```bash
python3 app.py
```

Visit `http://localhost:5000` → serves `login.html`, with email/password
fields and "Continue with Google" underneath. Register at
`http://localhost:5000/register.html`.

## How it fits together

- `backend/app.py` — Flask app factory: config, extensions, blueprints, and
  routes that serve the static frontend files.
- `backend/models.py` — SQLAlchemy models (`User`, `Conversation`, `Message`).
- `backend/auth_routes.py` — `/api/register`, `/api/login`, `/api/logout`,
  `/api/me`, and the Google OAuth flow (`/auth/google`,
  `/auth/google/callback`).
- `backend/chat_routes.py` — conversation CRUD + `/api/chat`, which streams
  Server-Sent Events from NVIDIA NIM to the browser and saves both sides of
  the exchange to Postgres.
- `frontend/*.html` + `frontend/js/*.js` — no framework, just `fetch()`
  calls against the Flask API, with `credentials: "include"` so the
  session cookie is sent.

## Deploying later

Flask apps don't deploy to Vercel the way Next.js does (Vercel's Python
support is limited to serverless functions, not long-running Flask apps
with persistent SSE streams). Better fits when you're ready:

- **Render** or **Railway** — push the repo, they detect Flask/`gunicorn`
  automatically. Add the same env vars from `.env` in their dashboard.
- Run in production with `gunicorn -w 2 -b 0.0.0.0:$PORT app:app` instead
  of `python3 app.py` (add `gunicorn` — already in `requirements.txt`).
- Update `FRONTEND_URL` and the Google redirect URIs to your production
  domain once you have one, same pattern as the localhost setup above.

Let me know when you're ready to deploy and I'll walk through whichever
host you pick.

## Roadmap

Same as before — this covers auth, persistent chat, and one AI provider.
Multi-provider switching, file/image upload, billing, admin dashboard,
etc. are still open. Ask for any of these next.
