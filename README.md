# Aether

**Your thoughts, elevated.**

A polished AI chat application with persistent conversations, streaming responses, file attachments, document generation, and Google/email auth.

## Security notes (important)

- **Never commit `backend/.env`**. It is listed in `.gitignore`. Only use `.env.example` as a template.
- `SECRET_KEY` is **required** — the app will refuse to start without it. Generate with:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- CORS is restricted to `FRONTEND_URL` (plus localhost for development).
- Rate limits apply to login, registration, password-reset, OTP, and chat endpoints.
- Session cookies are `HttpOnly` and `Secure` in production (`FLASK_ENV=production`).

If secrets were ever committed or shared in a ZIP, **rotate them immediately**:
Neon DB password, `SECRET_KEY`, Google OAuth client secret, Groq/NVIDIA API keys, Brevo API key.

## Quick start

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your real values
python app.py
```

Open http://localhost:5000

## Features

- Email/password + Google OAuth
- Streaming chat (SSE) with multiple Groq models
- Conversation history, search, rename, delete
- Image + text file attachments
- Code blocks with copy / download
- Live HTML/CSS/JS review panel
- Document generation (DOCX / PPTX / PDF)
- Image generation via prompt fences
- Settings: profile, change password, delete account
- Mobile-friendly layout with suggested prompts

## Production

Prefer Render, Railway, or similar long-running hosts (not Vercel serverless) because of SSE streams.

```bash
gunicorn -w 2 -b 0.0.0.0:$PORT app:app
```

Set `FLASK_ENV=production` and update `FRONTEND_URL` + Google redirect URIs to your domain.

## Project layout

- `backend/app.py` — Flask app, security config, static serving
- `backend/auth_routes.py` — auth + profile endpoints
- `backend/chat_routes.py` — conversations + streaming chat
- `backend/document_gen.py` — DOCX/PPTX/PDF builders
- `frontend/` — vanilla HTML/CSS/JS UI

Built by Greg Garrido.
