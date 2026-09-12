import os
import json
import requests
from flask import Blueprint, request, jsonify, Response, stream_with_context, current_app
from flask_login import login_required, current_user

from extensions import db
from models import Conversation, Message

chat_bp = Blueprint("chat", __name__)

# Reused across requests so we keep a warm, keep-alive HTTPS connection to the
# Groq endpoint instead of paying a fresh TCP/TLS handshake on every
# single chat message — this alone shaves meaningful time off time-to-first-token.
_http_session = requests.Session()

# How many most-recent messages (across both roles) to send as context. Every
# extra message in the prompt is extra prefill the model has to read before it
# can start replying, so trimming this keeps time-to-first-token fast even in
# long-running conversations, while still preserving plenty of recent context.
MAX_HISTORY_MESSAGES = 14

DEFAULT_MODEL = "openai/gpt-oss-120b"

# Curated, currently-active (non-deprecated) Groq models. "vision": True means
# the model accepts image inputs. "effort": True means it accepts a
# reasoning_effort ("low" / "medium" / "high") parameter.
MODEL_CATALOG = [
    {
        "id": "openai/gpt-oss-120b",
        "label": "GPT-OSS 120B",
        "description": "Most capable — best for coding, reasoning, complex tasks",
        "vision": False,
        "effort": True,
    },
    {
        "id": "openai/gpt-oss-20b",
        "label": "GPT-OSS 20B",
        "description": "Fastest — best for everyday chat",
        "vision": False,
        "effort": True,
    },
    {
        "id": "qwen/qwen3.6-27b",
        "label": "Qwen3.6 27B",
        "description": "Strong reasoning, understands images too",
        "vision": True,
        "effort": False,
    },
    {
        "id": "meta-llama/llama-4-scout-17b-16e-instruct",
        "label": "Llama 4 Scout",
        "description": "Built for image understanding and OCR",
        "vision": True,
        "effort": False,
    },
    {
        "id": "groq/compound",
        "label": "Compound",
        "description": "Agentic — can search the web and run code on its own",
        "vision": False,
        "effort": False,
    },
]
MODEL_BY_ID = {m["id"]: m for m in MODEL_CATALOG}
VISION_FALLBACK_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# Groq's own documented caps for image inputs — enforced here too so we fail
# fast with a clear error instead of letting Groq reject the whole request.
MAX_IMAGES_PER_MESSAGE = 5
MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024  # 4MB, matches Groq's base64 request limit
MAX_TEXT_ATTACHMENT_CHARS = 12000  # keeps prompt size (and cost/latency) bounded

SYSTEM_PROMPT = (
    "You are Aether, a helpful, concise AI assistant. "
    "You are embedded in a chat web app with these features available to the "
    "person you're talking to, which you can mention when relevant:\n"
    "- Multi-turn conversations with persistent history (saved per user, listed "
    "in the sidebar, resumable anytime)\n"
    "- Streamed, real-time responses token-by-token\n"
    "- Markdown rendering, including fenced code blocks with syntax labeling\n"
    "- A one-click copy button on every one of your replies, and on every "
    "individual code block\n"
    "- A downloadable file button on every code block, saving it locally with "
    "the correct file extension inferred from the language\n"
    "- A 'review panel' that opens a live rendered preview of any HTML/CSS/JS "
    "you generate, so the person can see the actual working page/UI you built "
    "instead of only reading code\n"
    "- A model picker letting the person switch between different underlying "
    "models (different speed/capability tradeoffs), plus a reasoning-effort "
    "control for models that support it\n"
    "- Image attachments: when a vision-capable model is selected (or "
    "automatically used because an image was attached), you can see and "
    "describe/analyze images the person uploads\n"
    "- Text file attachments (.txt, .md, .csv, .json, code files, etc.), "
    "whose contents get included in the conversation for you to read\n"
    "- Real image generation: when the person asks you to draw, create, "
    "generate, or make an image/picture/photo/illustration of something, "
    "respond with a fenced code block using the language tag 'image' "
    "containing ONLY a single, vivid, detailed English description of what "
    "to generate — no other commentary inside the fence. Example:\n"
    "```image\n"
    "a fluffy orange tabby cat sitting on a sunlit windowsill, "
    "photorealistic, warm afternoon light\n"
    "```\n"
    "You may add a short sentence before or after the block, but the block "
    "itself must contain nothing but the prompt. This actually generates and "
    "displays a real image to the person — it is not a placeholder or a "
    "description of what an image would look like, so always use this "
    "format instead of just describing an image in prose.\n"
    "- Real document generation: when the person asks for a resume, CV, "
    "cover letter, report, Word document, PowerPoint/presentation, or PDF, "
    "respond with a fenced code block using EXACTLY the language tag "
    "'document' (not 'json', not plain — literally the word 'document' "
    "right after the three backticks) containing ONLY valid JSON (no "
    "comments, no trailing commas) with this exact shape:\n"
    "```document\n"
    "{\n"
    '  "format": "docx" | "pptx" | "pdf",\n'
    '  "title": "Document Title",\n'
    '  "sections": [\n'
    '    { "heading": "Section Heading", "body": "A paragraph line.\\n- A '
    'bullet point\\n- Another bullet point" }\n'
    "  ]\n"
    "}\n"
    "```\n"
    "Use \"docx\" for resumes/CVs/cover letters/reports/Word documents, "
    "\"pptx\" when they ask for a presentation/slides/PowerPoint, and "
    "\"pdf\" when they explicitly ask for a PDF. Put each resume section "
    "(Summary, Experience, Education, Skills, etc.) or each slide's content "
    "as one entry in \"sections\" — for pptx, each section becomes one "
    "slide. Separate lines within \"body\" with \\n, and prefix bullet "
    "lines with \"- \". This generates a real, downloadable file — it is "
    "not a mockup, so always use this exact fenced format instead of "
    "writing the resume/document out as plain chat text, and never show "
    "the raw JSON to the person as regular visible text outside the fence. "
    "You may add a short sentence before or after the block, but the block "
    "itself must contain only the JSON.\n"
    "- Google or email/password sign-in\n\n"
    "You do NOT currently have: voice input or text-to-speech, code "
    "execution/sandboxing, or billing plans. If asked to do these, say "
    "honestly that they aren't available yet rather than pretending to "
    "perform them.\n\n"
    "Format code with markdown fences and include a language tag (e.g. "
    "```html, ```css, ```javascript, ```python) so it renders correctly.\n\n"
    "Keep prose formatting minimal and clean: do NOT use asterisks for bold "
    "or emphasis (no **word** or *word*), and don't reach for headers, bullet "
    "lists, or other heavy markdown structure unless the content genuinely "
    "needs it (e.g. a real list of steps or options). Default to plain, "
    "natural sentences and paragraphs like a person texting, not a "
    "formatted document.\n\n"
    "If asked who made you, who created/built/developed Aether, or about your "
    "origins: Aether was built by Greg Garrido, a software developer based in "
    "the Philippines. He's also worked on other projects, including Himeyz and "
    "EVSU-ClassTrack. Mention this plainly when it's relevant to the "
    "conversation (e.g. the person is directly asking about your creator or "
    "this app). Don't volunteer his biography unprompted, and don't pad it "
    "with personal details beyond what's above."
)


@chat_bp.post("/api/generate-document")
@login_required
def generate_document():
    from document_gen import BUILDERS, MIME_TYPES, slugify

    data = request.get_json(silent=True) or {}
    fmt = data.get("format")
    title = (data.get("title") or "Document").strip()
    sections = data.get("sections") or []

    if fmt not in BUILDERS:
        return jsonify({"error": "Unsupported document format."}), 400
    if not sections:
        return jsonify({"error": "No content to generate."}), 400

    try:
        buf = BUILDERS[fmt](title, sections)
    except ImportError as e:
        print(f"[doc] Missing dependency for format={fmt}: {e}")
        return jsonify({
            "error": "The document generation libraries aren't installed yet. "
                     "Run: pip install -r requirements.txt (in backend/), then restart the server."
        }), 500
    except Exception as e:
        print(f"[doc] Generation failed for format={fmt}: {type(e).__name__}: {e}")
        return jsonify({"error": "Couldn't generate the document. Check the backend terminal for details."}), 500

    from flask import send_file
    return send_file(
        buf,
        mimetype=MIME_TYPES[fmt],
        as_attachment=True,
        download_name=f"{slugify(title)}.{fmt}",
    )


@chat_bp.get("/api/models")
@login_required
def list_models():
    return jsonify({"models": MODEL_CATALOG, "default": DEFAULT_MODEL})


@chat_bp.get("/api/conversations")
@login_required
def list_conversations():
    conversations = (
        Conversation.query.filter_by(user_id=current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return jsonify([c.to_summary_dict() for c in conversations])


@chat_bp.get("/api/conversations/<conversation_id>")
@login_required
def get_conversation(conversation_id):
    convo = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()
    if not convo:
        return jsonify({"error": "Not found"}), 404
    return jsonify(
        {
            "id": convo.id,
            "title": convo.title,
            "messages": [m.to_dict() for m in convo.messages],
        }
    )


@chat_bp.delete("/api/conversations/<conversation_id>")
@login_required
def delete_conversation(conversation_id):
    convo = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()
    if not convo:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(convo)
    db.session.commit()
    return jsonify({"ok": True})


@chat_bp.post("/api/chat")
@login_required
def chat():
    data = request.get_json(silent=True) or {}
    conversation_id = data.get("conversationId")
    message = (data.get("message") or "").strip()
    attachments = data.get("attachments") or []
    requested_model = data.get("model") or DEFAULT_MODEL
    requested_effort = data.get("effort")

    if requested_model not in MODEL_BY_ID:
        requested_model = DEFAULT_MODEL

    if not message and not attachments:
        return jsonify({"error": "Message is required"}), 400

    # --- Validate + split attachments into images vs. text files ---
    images = [a for a in attachments if a.get("kind") == "image"]
    text_files = [a for a in attachments if a.get("kind") == "file"]

    if len(images) > MAX_IMAGES_PER_MESSAGE:
        return jsonify({"error": f"You can attach up to {MAX_IMAGES_PER_MESSAGE} images at once."}), 400

    for img in images:
        data_url = img.get("dataUrl") or ""
        if len(data_url) > MAX_IMAGE_BASE64_BYTES:
            return jsonify({"error": f"'{img.get('name', 'image')}' is too large (max 4MB)."}), 400

    # Text-file contents get inlined into the prompt as fenced blocks so the
    # model can actually read them — Groq has no separate "file" input type.
    augmented_text = message
    for f in text_files:
        excerpt = (f.get("text") or "")[:MAX_TEXT_ATTACHMENT_CHARS]
        augmented_text += f"\n\n[Attached file: {f.get('name', 'file')}]\n```\n{excerpt}\n```"
    augmented_text = augmented_text.strip() or "(see attached file)"

    # Images require a vision-capable model — silently use one for this
    # request if the selected model can't see images, rather than erroring.
    resolved_model = requested_model
    if images and not MODEL_BY_ID[requested_model]["vision"]:
        resolved_model = VISION_FALLBACK_MODEL

    effort = requested_effort if requested_effort in ("low", "medium", "high") else None
    use_effort = effort and MODEL_BY_ID[resolved_model]["effort"]

    convo = None
    if conversation_id:
        convo = Conversation.query.filter_by(id=conversation_id, user_id=current_user.id).first()

    is_new_convo = convo is None
    if is_new_convo:
        convo = Conversation(user_id=current_user.id, title=(message or text_files[0].get("name") or images[0].get("name") or "New conversation")[:60])
        db.session.add(convo)
        db.session.flush()  # assigns convo.id without a network round-trip commit

    user_msg = Message(
        conversation_id=convo.id,
        role="user",
        content=message or "(see attached file)",
        attachments=json.dumps(attachments) if attachments else None,
    )
    db.session.add(user_msg)
    db.session.commit()  # one commit covers both the new conversation and the message

    # Build the Groq-bound content for this turn. Images use OpenAI/Groq's
    # multimodal content-array format; plain text stays a simple string
    # (smaller payload, and matches what every earlier history message uses).
    if images:
        last_user_content = [{"type": "text", "text": augmented_text}]
        for img in images:
            last_user_content.append({"type": "image_url", "image_url": {"url": img.get("dataUrl")}})
    else:
        last_user_content = augmented_text

    history_messages = convo.messages[-MAX_HISTORY_MESSAGES:]
    if history_messages and history_messages[-1].id == user_msg.id:
        history_messages = history_messages[:-1]

    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in history_messages:
        history.append({"role": m.role, "content": m.content})
    history.append({"role": "user", "content": last_user_content})

    convo_id = convo.id
    real_app = current_app._get_current_object()

    def generate():
        yield f"event: meta\ndata: {json.dumps({'conversationId': convo_id, 'resolvedModel': resolved_model})}\n\n"

        full_reply = []
        try:
            payload = {
                "model": resolved_model,
                "messages": history,
                "temperature": 0.6,
                "top_p": 0.9,
                "max_tokens": 2048,
                "stream": True,
            }
            if use_effort:
                payload["reasoning_effort"] = effort

            resp = _http_session.post(
                f"{os.getenv('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                },
                json=payload,
                stream=True,
                timeout=120,
            )
            resp.encoding = "utf-8"  # Groq's SSE stream doesn't declare a charset, and requests
            # defaults to ISO-8859-1 for text/event-stream without one — without this, any
            # multi-byte UTF-8 character (emoji, curly quotes, "…") comes out as mojibake.

            if resp.status_code >= 400:
                error_body = resp.text[:500]
                print(f"[chat] Groq API error {resp.status_code}: {error_body}")
                friendly = f"[Model error {resp.status_code}. Check the backend terminal for details.]"
                full_reply.append(friendly)
                yield f"event: token\ndata: {json.dumps({'delta': friendly})}\n\n"
            else:
                for raw_line in resp.iter_lines(decode_unicode=True, chunk_size=1024):
                    if not raw_line or not raw_line.startswith("data:"):
                        continue
                    sse_payload = raw_line[len("data:"):].strip()
                    if sse_payload == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(sse_payload)
                    except json.JSONDecodeError:
                        print(f"[chat] Unparseable chunk from Groq: {sse_payload[:300]}")
                        continue

                    if "error" in chunk:
                        print(f"[chat] Groq returned an inline error: {chunk['error']}")
                        friendly = f"[Model error: {chunk['error'].get('message', 'unknown error')}]"
                        full_reply.append(friendly)
                        yield f"event: token\ndata: {json.dumps({'delta': friendly})}\n\n"
                        continue

                    try:
                        delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                    except (IndexError, KeyError):
                        continue
                    if delta:
                        full_reply.append(delta)
                        yield f"event: token\ndata: {json.dumps({'delta': delta})}\n\n"

                if not full_reply:
                    print(f"[chat] Groq responded 200 with zero content tokens for conversation {convo_id}.")
        except requests.RequestException as e:
            print(f"[chat] Request to Groq failed: {e}")
            yield f"event: token\ndata: {json.dumps({'delta': f'[Error reaching the model: {str(e)}]'})}\n\n"
        finally:
            reply_text = "".join(full_reply)
            if reply_text.strip():
                # The request context is gone by the time this generator resumes,
                # so we push a fresh app context using the app captured earlier.
                with real_app.app_context():
                    assistant_msg = Message(
                        conversation_id=convo_id, role="assistant", content=reply_text
                    )
                    db.session.add(assistant_msg)
                    db.session.commit()
            yield "event: done\ndata: {}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )