const loadingEl = document.getElementById("loading");
const appEl = document.getElementById("app");
const messagesInner = document.getElementById("messages-inner");
const messagesWrap = document.getElementById("messages-wrap");
const emptyState = document.getElementById("empty-state");
const conversationList = document.getElementById("conversation-list");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const userEmailEl = document.getElementById("user-email");
const signOutBtn = document.getElementById("sign-out-btn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const hamburgerBtn = document.getElementById("hamburger-btn");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const attachmentStrip = document.getElementById("attachment-strip");
const modelPicker = document.getElementById("model-picker");
const modelPickerBtn = document.getElementById("model-picker-btn");
const modelPickerLabel = document.getElementById("model-picker-label");
const modelPickerMenu = document.getElementById("model-picker-menu");
const stopBtn = document.getElementById("stop-btn"); // optional, may be null
const convoSearch = document.getElementById("convo-search");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const settingsName = document.getElementById("settings-name");
const settingsEmail = document.getElementById("settings-email");
const saveProfileBtn = document.getElementById("save-profile-btn");
const profileMsg = document.getElementById("profile-msg");
const settingsCurrentPw = document.getElementById("settings-current-pw");
const settingsNewPw = document.getElementById("settings-new-pw");
const changePwBtn = document.getElementById("change-pw-btn");
const pwMsg = document.getElementById("pw-msg");
const deleteAccountBtn = document.getElementById("delete-account-btn");
const suggestedPrompts = document.getElementById("suggested-prompts");
const sidebarCollapseBtn = document.getElementById("sidebar-collapse-btn");
const railExpandBtn = document.getElementById("rail-expand-btn");
const railNewChat = document.getElementById("rail-new-chat");
const railChats = document.getElementById("rail-chats");
const railSettings = document.getElementById("rail-settings");
const railUser = document.getElementById("rail-user");
const railUserInitial = document.getElementById("rail-user-initial");
const userNameEl = document.getElementById("user-name");
const userAvatarEl = document.getElementById("user-avatar");
const navChats = document.getElementById("nav-chats");

let activeId = null;
let streaming = false;
let userInitial = "U";
let abortController = null;
let lastUserMessage = null; 
let currentUser = null;

let models = [];
let selectedModelId = localStorage.getItem("aether_model") || null;
let selectedEffort = localStorage.getItem("aether_effort") || "medium";
let effortSubmenuOpen = false;
let moreModelsOpen = false;
let pendingAttachments = []; 

const FILE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const CLOSE_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const CHECK_ICON_SM = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const CHEVRON_RIGHT = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
const TRASH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

const TEXTY_EXT = /\.(txt|md|markdown|csv|json|log|py|js|jsx|ts|tsx|html|htm|css|yml|yaml|xml|sql|c|cpp|h|java|go|rb|php|sh|toml|ini|env)$/i;
const PDF_EXT = /\.pdf$/i;

const reviewPanel = document.getElementById("review-panel");
const reviewOverlay = document.getElementById("review-overlay");
const reviewProjectName = document.getElementById("review-project-name");
const reviewIframe = document.getElementById("review-iframe");
const reviewNoPreview = document.getElementById("review-no-preview");
const reviewFileList = document.getElementById("review-file-list");
const reviewLangBadge = document.getElementById("review-lang-badge");
const reviewFilename = document.getElementById("review-filename");
const reviewCodeContent = document.getElementById("review-code-content");
const reviewCopyBtn = document.getElementById("review-copy-btn");
const reviewDownloadBtn = document.getElementById("review-download-btn");
const reviewDownloadAllBtn = document.getElementById("review-download-all-btn");
const reviewCloseBtn = document.getElementById("review-close-btn");
const reviewTabPreview = document.getElementById("review-tab-preview");
const reviewTabFiles = document.getElementById("review-tab-files");
const reviewPanePreview = document.getElementById("review-pane-preview");
const reviewPaneFiles = document.getElementById("review-pane-files");

let currentProject = null; 
let currentReviewFile = null;
let fileCounter = 0;

const EXT_MAP = {
  javascript: "js", js: "js", jsx: "jsx", typescript: "ts", ts: "ts", tsx: "tsx",
  python: "py", py: "py", html: "html", css: "css", json: "json",
  bash: "sh", sh: "sh", shell: "sh", zsh: "sh", powershell: "ps1",
  java: "java", c: "c", cpp: "cpp", "c++": "cpp", csharp: "cs", "c#": "cs",
  go: "go", rb: "rb", ruby: "rb", php: "php", sql: "sql",
  yaml: "yaml", yml: "yaml", md: "md", markdown: "md", xml: "xml",
  swift: "swift", kotlin: "kt", rust: "rs", txt: "txt", text: "txt", plaintext: "txt",
};

function extForLang(lang) {
  const key = (lang || "").toLowerCase().trim();
  return EXT_MAP[key] || (key || "txt");
}

function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 1000000;
}

const documentBlockStore = new Map(); 
let documentBlockSeq = 0;

const DOC_FORMAT_INFO = {
  docx: { label: "Word Document", icon: "📄" },
  pptx: { label: "PowerPoint Presentation", icon: "📊" },
  pdf: { label: "PDF Document", icon: "📕" },
};

function looksLikeDocumentSpec(text) {
  try {
    const obj = JSON.parse(text);
    return (
      obj && typeof obj === "object" &&
      ["docx", "pptx", "pdf"].includes((obj.format || "").toLowerCase()) &&
      Array.isArray(obj.sections)
    );
  } catch (err) {
    return false;
  }
}

function renderDocumentBlock(jsonText) {
  let spec;
  try {
    spec = JSON.parse(jsonText);
  } catch (err) {
    return null;
  }

  const format = (spec.format || "").toLowerCase();
  const info = DOC_FORMAT_INFO[format];
  if (!info) return null;

  const id = `doc-${++documentBlockSeq}`;
  documentBlockStore.set(id, {
    format,
    title: spec.title || "Document",
    sections: Array.isArray(spec.sections) ? spec.sections : [],
  });

  const sectionCount = Array.isArray(spec.sections) ? spec.sections.length : 0;
  const subtitle = format === "pptx"
    ? `${sectionCount} slide${sectionCount === 1 ? "" : "s"}`
    : `${sectionCount} section${sectionCount === 1 ? "" : "s"}`;

  return `
    <div class="document-block" data-doc-id="${id}">
      <div class="document-block-icon">${info.icon}</div>
      <div class="document-block-info">
        <span class="document-block-title">${escapeHtml(spec.title || "Document")}</span>
        <span class="document-block-subtitle">${info.label} · ${subtitle}</span>
      </div>
      <button class="icon-btn-sm document-download-btn" data-action="download-document" data-doc-id="${id}" title="Download ${format.toUpperCase()}">${DOWNLOAD_ICON}</button>
    </div>`;
}

function renderImageBlock(prompt) {
  if (!prompt) return "";
  const seed = hashSeed(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
  return `
    <div class="generated-image-block">
      <img class="generated-image" src="${url}" alt="${escapeHtml(prompt)}" loading="lazy" />
      <div class="generated-image-toolbar">
        <span class="generated-image-caption">${escapeHtml(prompt)}</span>
        <button class="icon-btn-sm" data-action="download-image" data-url="${url}" title="Download image">${DOWNLOAD_ICON}</button>
      </div>
    </div>`;
}

const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const DOWNLOAD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const REVIEW_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`;
const EYE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const REGEN_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
const PENCIL_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      
    }
    document.body.removeChild(ta);
    return true;
  }
}

function flashCopied(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = CHECK_ICON;
  btn.classList.add("copied");
  setTimeout(() => {
    btn.innerHTML = original;
    btn.classList.remove("copied");
  }, 1200);
}

function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadText(content, ext) {
  fileCounter += 1;
  const filename = `aether-file-${fileCounter}.${ext}`;
  triggerDownload(content, filename);
  return filename;
}

function buildPreviewDocument(files) {
  const htmlFile = files.find((f) => f.ext === "html");
  const cssFiles = files.filter((f) => f.ext === "css");
  const jsFiles = files.filter((f) => f.ext === "js" || f.ext === "jsx");

  if (!htmlFile) return null;

  const styleTags = cssFiles.map((f) => `<style>\n${f.content}\n</style>`).join("\n");
  const scriptTags = jsFiles.map((f) => `<script>\n${f.content}\n</script>`).join("\n");

  let doc = htmlFile.content;
  const hasFullDoc = /<html[\s>]/i.test(doc);

  if (!hasFullDoc) {
    
    doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${doc}</body></html>`;
  }

  if (styleTags) {
    doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${styleTags}\n</head>`) : styleTags + doc;
  }
  if (scriptTags) {
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${scriptTags}\n</body>`) : doc + scriptTags;
  }
  return doc;
}

function fileLabel(file, index, files) {
  const sameExt = files.filter((f) => f.ext === file.ext);
  if (sameExt.length === 1) {
    if (file.ext === "html") return "index.html";
    if (file.ext === "css") return "style.css";
    if (file.ext === "js") return "script.js";
    return `snippet.${file.ext}`;
  }
  const posInGroup = sameExt.indexOf(file) + 1;
  return `${file.ext}-${posInGroup}.${file.ext}`;
}

function selectReviewFile(file) {
  currentReviewFile = file;
  reviewLangBadge.textContent = (file.lang || "text").toUpperCase();
  reviewFilename.textContent = file.filename;
  reviewCodeContent.textContent = file.content;
  reviewFileList.querySelectorAll(".review-file-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filename === file.filename);
  });
}

function switchReviewTab(tab) {
  const isPreview = tab === "preview";
  reviewTabPreview.classList.toggle("active", isPreview);
  reviewTabFiles.classList.toggle("active", !isPreview);
  reviewPanePreview.style.display = isPreview ? "flex" : "none";
  reviewPaneFiles.style.display = isPreview ? "none" : "flex";
}
reviewTabPreview.addEventListener("click", () => switchReviewTab("preview"));
reviewTabFiles.addEventListener("click", () => switchReviewTab("files"));

function openReviewPanel(files, label) {
  const namedFiles = files.map((f, i) => ({ ...f, filename: fileLabel(f, i, files) }));
  currentProject = { files: namedFiles };
  reviewProjectName.textContent = label || "Project review";

  reviewFileList.innerHTML = "";
  namedFiles.forEach((file) => {
    const chip = document.createElement("button");
    chip.className = "review-file-chip";
    chip.textContent = file.filename;
    chip.dataset.filename = file.filename;
    chip.addEventListener("click", () => selectReviewFile(file));
    reviewFileList.appendChild(chip);
  });
  if (namedFiles.length) selectReviewFile(namedFiles[0]);

  const previewDoc = buildPreviewDocument(namedFiles);
  if (previewDoc) {
    reviewIframe.srcdoc = previewDoc;
    reviewIframe.style.display = "block";
    reviewNoPreview.style.display = "none";
    switchReviewTab("preview");
  } else {
    reviewIframe.style.display = "none";
    reviewNoPreview.style.display = "flex";
    switchReviewTab("files");
  }

  reviewPanel.classList.add("open");
  if (window.innerWidth <= 768) reviewOverlay.classList.add("open");
}

function closeReviewPanel() {
  reviewPanel.classList.remove("open");
  reviewOverlay.classList.remove("open");
}

reviewCloseBtn.addEventListener("click", closeReviewPanel);
reviewOverlay.addEventListener("click", closeReviewPanel);
reviewCopyBtn.addEventListener("click", async () => {
  if (!currentReviewFile) return;
  await copyText(currentReviewFile.content);
  flashCopied(reviewCopyBtn);
});
reviewDownloadBtn.addEventListener("click", () => {
  if (!currentReviewFile) return;
  triggerDownload(currentReviewFile.content, currentReviewFile.filename);
});
reviewDownloadAllBtn.addEventListener("click", () => {
  if (!currentProject) return;
  
  
  currentProject.files.forEach((file, i) => {
    setTimeout(() => triggerDownload(file.content, file.filename), i * 150);
  });
});

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Small markdown renderer: fenced code blocks + paragraphs.
// Each code block gets a toolbar (copy / download / open in review panel).
const codeBlockStore = new Map();
const messageBlocksStore = new Map(); // msgId -> [blockId, ...] in order
let codeBlockSeq = 0;

function renderMarkdown(text, msgId) {
  if (msgId) messageBlocksStore.set(msgId, []);
  const parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      const trimmedWhole = parts[i].trim();
      if (trimmedWhole && looksLikeDocumentSpec(trimmedWhole)) {
        const rendered = renderDocumentBlock(trimmedWhole);
        if (rendered) {
          html += rendered;
          continue;
        }
      }
      // Plain text (not code): strip stray markdown asterisks (**bold**,
      // *italic*) since the model is instructed to avoid them but doesn't
      // always comply — this is a safety net so they never show up raw.
      const cleaned = parts[i].replace(/\*/g, "");
      const paragraphs = cleaned.split(/\n{2,}/).filter((p) => p.trim());
      html += paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
    } else if (i % 3 === 2) {
      const lang = (parts[i - 1] || "").trim();
      const code = parts[i];

      if (lang.toLowerCase() === "image") {
        html += renderImageBlock(code.trim());
        continue;
      }
      // Accept the 'document' tag, but also fall back to detecting the spec
      // by its JSON shape — models don't always use the exact fence tag
      // asked for (e.g. they might use ```json instead of ```document).
      if (lang.toLowerCase() === "document" || looksLikeDocumentSpec(code.trim())) {
        const rendered = renderDocumentBlock(code.trim());
        if (rendered) {
          html += rendered;
          continue;
        }
      }

      const ext = extForLang(lang);
      const id = `cb-${++codeBlockSeq}`;
      codeBlockStore.set(id, { lang: lang || "text", ext, content: code });
      if (msgId) {
        if (!messageBlocksStore.has(msgId)) messageBlocksStore.set(msgId, []);
        messageBlocksStore.get(msgId).push(id);
      }
      const lines = code.replace(/\n$/, "").split("\n");
      const lineNos = lines.map((_, i) => i + 1).join("\n");
      html += `
        <div class="code-block" data-block-id="${id}">
          <div class="code-block-toolbar">
            <span class="code-block-lang">${escapeHtml(lang || "text")}</span>
            <div class="code-block-actions">
              <button class="icon-btn-sm" data-action="copy-code" data-block-id="${id}" title="Copy code">${COPY_ICON}</button>
              <button class="icon-btn-sm" data-action="download-code" data-block-id="${id}" title="Download file">${DOWNLOAD_ICON}</button>
              <button class="icon-btn-sm" data-action="review-code" data-block-id="${id}" title="Open in review panel">${REVIEW_ICON}</button>
            </div>
          </div>
          <div class="code-block-body">
            <pre class="code-line-nos" aria-hidden="true">${lineNos}</pre>
            <pre class="code-content"><code>${escapeHtml(code)}</code></pre>
          </div>
        </div>`;
    }
  }
  return html || "<p></p>";
}

// Delegated click handling for code-block toolbar buttons (buttons are
// injected via innerHTML, so listeners are attached once on the container).
messagesInner.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  if (btn.dataset.action === "download-image") {
    const url = btn.dataset.url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "aether-image.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, "_blank");
    }
    return;
  }

  if (btn.dataset.action === "download-document") {
    const spec = documentBlockStore.get(btn.dataset.docId);
    if (!spec) return;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(spec),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Couldn't generate the document.");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${(spec.title || "document").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${spec.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Couldn't reach the server to generate the document.");
    } finally {
      btn.innerHTML = originalHtml;
    }
    return;
  }

  const block = codeBlockStore.get(btn.dataset.blockId);
  if (!block) return;

  if (btn.dataset.action === "copy-code") {
    await copyText(block.content);
    flashCopied(btn);
  } else if (btn.dataset.action === "download-code") {
    downloadText(block.content, block.ext);
  } else if (btn.dataset.action === "review-code") {
    openReviewPanel([block], `snippet.${block.ext}`);
  } else if (btn.dataset.action === "preview-project") {
    const msgId = btn.dataset.msgId;
    const blockIds = messageBlocksStore.get(msgId) || [];
    const files = blockIds.map((id) => codeBlockStore.get(id)).filter(Boolean);
    if (files.length) openReviewPanel(files, "Project review");
  }
});

function scrollToBottom() {
  messagesWrap.scrollTop = messagesWrap.scrollHeight;
}

// Streaming tokens can arrive faster than the browser can usefully paint.
// Instead of re-parsing markdown and replacing innerHTML on every single
// token (which forces layout/reflow each time and makes long replies feel
// laggy), we coalesce updates to once per animation frame — the text still
// accumulates instantly in memory, only the (expensive) DOM paint is throttled.
let pendingRenderBubble = null;
let renderScheduled = false;

function flushAssistantRender() {
  renderScheduled = false;
  if (!pendingRenderBubble) return;
  const bubble = pendingRenderBubble;
  bubble.innerHTML = renderMarkdown(bubble.dataset.raw, bubble.dataset.msgId);
  scrollToBottom();
}

function scheduleAssistantRender(bubble) {
  pendingRenderBubble = bubble;
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(flushAssistantRender);
}

function avatarHtml(role) {
  if (role === "user") return `<div class="avatar">${userInitial}</div>`;
  return `<div class="avatar">AI</div>`;
}

let msgIdSeq = 0;

function buildMessageToolbar(bubble, msgId) {
  const bar = document.createElement("div");
  bar.className = "msg-toolbar";

  const copyBtn = document.createElement("button");
  copyBtn.className = "icon-btn-sm";
  copyBtn.title = "Copy response";
  copyBtn.innerHTML = COPY_ICON;
  copyBtn.addEventListener("click", async () => {
    await copyText(bubble.dataset.raw || bubble.textContent || "");
    flashCopied(copyBtn);
  });
  bar.appendChild(copyBtn);

  const regenBtn = document.createElement("button");
  regenBtn.className = "icon-btn-sm";
  regenBtn.title = "Regenerate response";
  regenBtn.innerHTML = REGEN_ICON;
  regenBtn.addEventListener("click", () => regenerateLast());
  bar.appendChild(regenBtn);

  const blockIds = messageBlocksStore.get(msgId);
  if (blockIds && blockIds.length) {
    const previewBtn = document.createElement("button");
    previewBtn.className = "icon-btn-sm";
    previewBtn.title = "Review the complete UI this created";
    previewBtn.innerHTML = EYE_ICON;
    previewBtn.dataset.action = "preview-project";
    previewBtn.dataset.msgId = msgId;
    bar.appendChild(previewBtn);
  }

  return bar;
}

function attachToolbarIfMissing(bubble, msgId) {
  const col = bubble.parentElement;
  if (!col || col.querySelector(".msg-toolbar")) return;
  col.appendChild(buildMessageToolbar(bubble, msgId));
}

function formatPHTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const formatted = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${formatted} PHT`;
}

function addMessageBubble(role, content, isTyping, createdAt, attachments) {
  emptyState.style.display = "none";
  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  const msgId = `msg-${++msgIdSeq}`;
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.dataset.raw = content || "";
  bubble.dataset.msgId = msgId;
  bubble.innerHTML = isTyping
    ? `<span class="typing-dots"><span></span><span></span><span></span></span>`
    : renderMarkdown(content, msgId);

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = formatPHTime(createdAt);

  const attachmentsHtml = renderMessageAttachments(attachments);

  if (role === "user") {
    const col = document.createElement("div");
    col.className = "user-col";
    if (attachmentsHtml) col.insertAdjacentHTML("beforeend", attachmentsHtml);
    col.appendChild(bubble);
    col.appendChild(timeEl);
    row.appendChild(col);
    row.insertAdjacentHTML("beforeend", avatarHtml("user"));
  } else {
    row.insertAdjacentHTML("beforeend", avatarHtml("assistant"));
    const col = document.createElement("div");
    col.className = "assistant-col";
    if (attachmentsHtml) col.insertAdjacentHTML("beforeend", attachmentsHtml);
    col.appendChild(bubble);
    col.appendChild(timeEl);
    row.appendChild(col);
    if (!isTyping) attachToolbarIfMissing(bubble, msgId);
  }

  messagesInner.appendChild(row);
  scrollToBottom();
  return bubble;
}

function clearMessages() {
  messagesInner.innerHTML = "";
  messagesInner.appendChild(emptyState);
  emptyState.style.display = "flex";
}

function openSidebar() {
  sidebar.classList.remove("collapsed");
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}
if (hamburgerBtn) hamburgerBtn.addEventListener("click", openSidebar);
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

// ---------- Model picker ----------

function currentModel() {
  return models.find((m) => m.id === selectedModelId) || models[0] || null;
}

async function loadModels() {
  try {
    const res = await fetch("/api/models", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    models = data.models || [];
    if (!selectedModelId || !models.some((m) => m.id === selectedModelId)) {
      selectedModelId = data.default || (models[0] && models[0].id);
    }
    renderModelPickerButton();
    renderModelPickerMenu();
  } catch (err) {
    /* model list is a nice-to-have — chat still works with the backend default */
  }
}

function renderModelPickerButton() {
  const m = currentModel();
  modelPickerLabel.textContent = m ? m.label : "Model";
}

function renderModelPickerMenu() {
  const m = currentModel();
  if (!m) return;
  const others = models.filter((x) => x.id !== m.id);

  let html = `
    <button class="model-picker-item selected" data-select-model="${m.id}">
      <div class="item-top">
        <span class="item-name">${escapeHtml(m.label)}</span>
        <span class="item-check">${CHECK_ICON_SM}</span>
      </div>
      <span class="item-desc">${escapeHtml(m.description)}</span>
    </button>`;

  if (m.effort) {
    const effortLabel = selectedEffort.charAt(0).toUpperCase() + selectedEffort.slice(1);
    html += `
      <div class="effort-row" id="effort-toggle">
        <span class="item-name">Effort</span>
        <span class="effort-value">${effortLabel} ${CHEVRON_RIGHT}</span>
      </div>
      <div class="effort-submenu ${effortSubmenuOpen ? "open" : ""}" id="effort-submenu">
        ${["low", "medium", "high"].map((lvl) => `
          <button class="effort-option ${selectedEffort === lvl ? "selected" : ""}" data-select-effort="${lvl}">
            ${lvl.charAt(0).toUpperCase() + lvl.slice(1)}
          </button>`).join("")}
      </div>`;
  }

  html += `<div class="model-picker-divider"></div>`;
  html += `<button class="more-models-toggle" id="more-models-toggle">
      <span>More models</span>${CHEVRON_RIGHT}
    </button>`;

  if (moreModelsOpen) {
    html += others.map((om) => `
      <button class="model-picker-item" data-select-model="${om.id}">
        <div class="item-top">
          <span class="item-name">${escapeHtml(om.label)}</span>
        </div>
        <span class="item-desc">${escapeHtml(om.description)}</span>
      </button>`).join("");
  }

  modelPickerMenu.innerHTML = html;
}

function openModelPicker() {
  moreModelsOpen = false;
  effortSubmenuOpen = false;
  renderModelPickerMenu();
  modelPickerMenu.classList.add("open");
}
function closeModelPicker() {
  modelPickerMenu.classList.remove("open");
}

modelPickerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (modelPickerMenu.classList.contains("open")) {
    closeModelPicker();
  } else {
    openModelPicker();
  }
});

modelPickerMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  const modelBtn = e.target.closest("[data-select-model]");
  const effortBtn = e.target.closest("[data-select-effort]");
  const effortToggle = e.target.closest("#effort-toggle");
  const moreToggle = e.target.closest("#more-models-toggle");

  if (modelBtn) {
    selectedModelId = modelBtn.dataset.selectModel;
    localStorage.setItem("aether_model", selectedModelId);
    renderModelPickerButton();
    closeModelPicker();
  } else if (effortBtn) {
    selectedEffort = effortBtn.dataset.selectEffort;
    localStorage.setItem("aether_effort", selectedEffort);
    effortSubmenuOpen = false;
    renderModelPickerMenu();
  } else if (effortToggle) {
    effortSubmenuOpen = !effortSubmenuOpen;
    renderModelPickerMenu();
  } else if (moreToggle) {
    moreModelsOpen = !moreModelsOpen;
    renderModelPickerMenu();
  }
});

document.addEventListener("click", (e) => {
  if (!modelPicker.contains(e.target)) closeModelPicker();
});

// ---------- Attachments ----------

function attachmentChipHtml(att, index) {
  const inner = att.kind === "image"
    ? `<img src="${att.dataUrl}" alt="${escapeHtml(att.name)}" />`
    : `<span class="chip-icon">${FILE_ICON}</span>`;
  return `
    <div class="attachment-chip" data-index="${index}">
      ${inner}
      <span class="chip-name">${escapeHtml(att.name)}</span>
      <button class="chip-remove" data-remove-attachment="${index}" title="Remove">${CLOSE_ICON}</button>
    </div>`;
}

function renderAttachmentStrip() {
  attachmentStrip.innerHTML = pendingAttachments.map((a, i) => attachmentChipHtml(a, i)).join("");
}

attachmentStrip.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-attachment]");
  if (!btn) return;
  const idx = parseInt(btn.dataset.removeAttachment, 10);
  pendingAttachments.splice(idx, 1);
  renderAttachmentStrip();
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 5;

async function handleFiles(fileList) {
  for (const file of Array.from(fileList)) {
    if (file.size > 12 * 1024 * 1024) {
      alert(`"${file.name}" is too large (max 12MB).`);
      continue;
    }
    if (file.type.startsWith("image/")) {
      const dataUrl = await readFileAsDataUrl(file);
      pendingAttachments.push({ kind: "image", name: file.name, mime: file.type, dataUrl });
    } else if (PDF_EXT.test(file.name) || file.type === "application/pdf") {
      // Extract text server-side so the model can actually read the PDF
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/extract-pdf", { method: "POST", credentials: "include", body: fd });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || `Couldn't read "${file.name}"`);
          continue;
        }
        pendingAttachments.push({
          kind: "file",
          name: file.name,
          mime: "application/pdf",
          text: data.text,
        });
      } catch (err) {
        alert(`Couldn't upload "${file.name}"`);
      }
    } else if (file.type.startsWith("text/") || TEXTY_EXT.test(file.name)) {
      const text = await readFileAsText(file);
      pendingAttachments.push({ kind: "file", name: file.name, mime: file.type || "text/plain", text });
    } else {
      alert(`Unsupported file type: ${file.name}`);
    }
  }
  renderAttachmentStrip();
}

attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  if (fileInput.files.length) await handleFiles(fileInput.files);
  fileInput.value = "";
});

// Drag-and-drop straight onto the composer
const composerEl = document.querySelector(".composer");
if (composerEl) {
  composerEl.addEventListener("dragover", (e) => e.preventDefault());
  composerEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) await handleFiles(e.dataTransfer.files);
  });
}

function renderMessageAttachments(attachments) {
  if (!attachments || !attachments.length) return "";
  const parts = attachments.map((a) => {
    if (a.kind === "image") {
      return `<img class="msg-attachment-image" src="${a.dataUrl}" alt="${escapeHtml(a.name)}" />`;
    }
    return `<span class="msg-attachment-file">${FILE_ICON} ${escapeHtml(a.name)}</span>`;
  });
  return `<div class="msg-attachments">${parts.join("")}</div>`;
}

async function deleteConversation(id, title) {
  const confirmed = window.confirm(`Delete "${title || "this conversation"}"? This can't be undone.`);
  if (!confirmed) return;

  const res = await fetch(`/api/conversations/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    alert("Couldn't delete this conversation — please try again.");
    return;
  }

  if (id === activeId) {
    activeId = null;
    setActiveConversationInUrl(null);
    clearMessages();
  }
  await loadConversations();
}

function setActiveConversationInUrl(id) {
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set("c", id);
  } else {
    url.searchParams.delete("c");
  }
  window.history.replaceState({}, "", url);
}

async function openConversation(id) {
  activeId = id;
  setActiveConversationInUrl(id);
  clearMessages();
  const res = await fetch(`/api/conversations/${id}`, { credentials: "include" });
  if (res.ok) {
    const data = await res.json();
    data.messages.forEach((m) => addMessageBubble(m.role, m.content, false, m.createdAt, m.attachments));
  } else {
    activeId = null;
    setActiveConversationInUrl(null);
  }
  await loadConversations();
  closeSidebar();
}

newChatBtn.addEventListener("click", () => {
  activeId = null;
  setActiveConversationInUrl(null);
  clearMessages();
  loadConversations();
  closeSidebar();
});

signOutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  window.location.href = "/login.html";
});

// Auto-grow the textarea as the user types
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener("click", sendMessage);

function setStreamingUI(on) {
  streaming = on;
  if (sendBtn) {
    sendBtn.style.display = "";
    sendBtn.disabled = on;
  }
  if (stopBtn) stopBtn.style.display = "none";
  if (!on) {
    abortController = null;
  }
}


if (suggestedPrompts) {
  suggestedPrompts.addEventListener("click", (e) => {
    const chip = e.target.closest(".prompt-chip");
    if (!chip) return;
    input.value = chip.dataset.prompt || chip.textContent;
    input.focus();
    input.dispatchEvent(new Event("input"));
    sendMessage();
  });
}

async function sendMessage(overrideText, overrideAttachments) {
  const text = (overrideText !== undefined ? overrideText : input.value).trim();
  const attachmentsForSend = overrideAttachments !== undefined ? overrideAttachments : pendingAttachments.slice();
  if ((!text && !attachmentsForSend.length) || streaming) return;

  if (overrideText === undefined) {
    input.value = "";
    input.style.height = "auto";
    pendingAttachments = [];
    renderAttachmentStrip();
  }

  lastUserMessage = { text, attachments: attachmentsForSend };
  setStreamingUI(true);

  addMessageBubble("user", text, false, null, attachmentsForSend);
  const assistantBubble = addMessageBubble("assistant", "", true);
  let assistantText = "";
  let firstTokenArrived = false;

  abortController = new AbortController();

  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: abortController.signal,
      body: JSON.stringify({
        conversationId: activeId,
        message: text,
        model: selectedModelId,
        effort: selectedEffort,
        attachments: attachmentsForSend,
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      assistantBubble.innerHTML = renderMarkdown((assistantBubble.dataset.raw || "") + "\n\n*(stopped)*", assistantBubble.dataset.msgId);
      attachToolbarIfMissing(assistantBubble, assistantBubble.dataset.msgId);
      setStreamingUI(false);
      return;
    }
    res = null;
  }

  if (!res || !res.ok || !res.body) {
    assistantBubble.innerHTML = renderMarkdown("Sorry — something went wrong reaching the model.", assistantBubble.dataset.msgId);
    attachToolbarIfMissing(assistantBubble, assistantBubble.dataset.msgId);
    setStreamingUI(false);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const evt of events) {
        const eventMatch = evt.match(/event:\s*(\w+)/);
        const dataMatch = evt.match(/data:\s*(.*)/);
        if (!eventMatch || !dataMatch) continue;
        const eventType = eventMatch[1];
        let data;
        try {
          data = JSON.parse(dataMatch[1]);
        } catch {
          continue;
        }

        if (eventType === "meta") {
          if (!activeId) {
            activeId = data.conversationId;
            setActiveConversationInUrl(activeId);
          }
        } else if (eventType === "token") {
          firstTokenArrived = true;
          assistantText += data.delta;
          assistantBubble.dataset.raw = assistantText;
          scheduleAssistantRender(assistantBubble);
        } else if (eventType === "done") {
          if (!firstTokenArrived) {
            assistantBubble.innerHTML = renderMarkdown("(No response received.)", assistantBubble.dataset.msgId);
          } else {
            pendingRenderBubble = null;
            assistantBubble.innerHTML = renderMarkdown(assistantBubble.dataset.raw, assistantBubble.dataset.msgId);
            scrollToBottom();
          }
          attachToolbarIfMissing(assistantBubble, assistantBubble.dataset.msgId);
          loadConversations();
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
    } else if (assistantText) {
      assistantBubble.innerHTML = renderMarkdown(assistantText + "\n\n*(stopped)*", assistantBubble.dataset.msgId);
      attachToolbarIfMissing(assistantBubble, assistantBubble.dataset.msgId);
    }
  } finally {
    setStreamingUI(false);
  }
}

function regenerateLast() {
  if (streaming || !lastUserMessage) return;
  // Remove last assistant bubble if present
  const rows = messagesInner.querySelectorAll(".msg-row.assistant");
  if (rows.length) {
    rows[rows.length - 1].remove();
  }
  // Also remove the corresponding user row so we re-add cleanly
  const userRows = messagesInner.querySelectorAll(".msg-row.user");
  if (userRows.length) {
    userRows[userRows.length - 1].remove();
  }
  sendMessage(lastUserMessage.text, lastUserMessage.attachments);
}

// ---------- Conversation search & rename ----------

let searchTimer = null;
if (convoSearch) {
  convoSearch.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      const q = convoSearch.value.trim();
      if (q.length < 2) {
        await loadConversations();
        return;
      }
      const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) return;
      const conversations = await res.json();
      renderConversationList(conversations);
    }, 250);
  });
}

function renderConversationList(conversations) {
  conversationList.innerHTML = "";
  conversations.forEach((c) => {
    const row = document.createElement("div");
    row.className = "conversation-row" + (c.id === activeId ? " active" : "");

    const btn = document.createElement("button");
    btn.className = "conversation-item";
    btn.textContent = c.title;
    btn.title = c.title;
    btn.addEventListener("click", () => openConversation(c.id));
    row.appendChild(btn);

    const renameBtn = document.createElement("button");
    renameBtn.className = "conversation-rename-btn";
    renameBtn.innerHTML = PENCIL_ICON;
    renameBtn.title = "Rename";
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      renameConversation(c.id, c.title);
    });
    row.appendChild(renameBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "conversation-delete-btn";
    delBtn.innerHTML = TRASH_ICON;
    delBtn.title = "Delete conversation";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(c.id, c.title);
    });
    row.appendChild(delBtn);

    conversationList.appendChild(row);
  });
}

async function renameConversation(id, currentTitle) {
  const title = window.prompt("Rename conversation", currentTitle || "");
  if (title === null) return;
  const trimmed = title.trim();
  if (!trimmed) return;
  const res = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title: trimmed }),
  });
  if (!res.ok) {
    alert("Couldn't rename — please try again.");
    return;
  }
  await loadConversations();
}

// Override loadConversations to use renderer
async function loadConversations() {
  const res = await fetch("/api/conversations", { credentials: "include" });
  if (!res.ok) return;
  const conversations = await res.json();
  renderConversationList(conversations);
}

// ---------- Settings ----------

function openSettings() {
  if (!currentUser) return;
  settingsName.value = currentUser.name || "";
  settingsEmail.value = currentUser.email || "";
  profileMsg.textContent = "";
  pwMsg.textContent = "";
  settingsCurrentPw.value = "";
  settingsNewPw.value = "";
  settingsPanel.style.display = "flex";
  settingsOverlay.style.display = "block";
  closeSidebar();
}
function closeSettings() {
  settingsPanel.style.display = "none";
  settingsOverlay.style.display = "none";
}
if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
if (settingsCloseBtn) settingsCloseBtn.addEventListener("click", closeSettings);
if (settingsOverlay) settingsOverlay.addEventListener("click", closeSettings);

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    profileMsg.textContent = "";
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: settingsName.value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      profileMsg.textContent = err.error || "Couldn't save.";
      profileMsg.className = "settings-msg error";
      return;
    }
    currentUser = await res.json();
    userEmailEl.textContent = currentUser.email;
    userInitial = (currentUser.name || currentUser.email || "U").trim().charAt(0).toUpperCase();
    profileMsg.textContent = "Saved.";
    profileMsg.className = "settings-msg ok";
  });
}

if (changePwBtn) {
  changePwBtn.addEventListener("click", async () => {
    pwMsg.textContent = "";
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPassword: settingsCurrentPw.value,
        newPassword: settingsNewPw.value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      pwMsg.textContent = data.error || "Couldn't update password.";
      pwMsg.className = "settings-msg error";
      return;
    }
    settingsCurrentPw.value = "";
    settingsNewPw.value = "";
    pwMsg.textContent = "Password updated.";
    pwMsg.className = "settings-msg ok";
  });
}

if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", async () => {
    const ok = window.confirm("Delete your account and all conversations permanently? This cannot be undone.");
    if (!ok) return;
    const res = await fetch("/api/me", { method: "DELETE", credentials: "include" });
    if (res.ok) {
      window.location.href = "/login.html";
    } else {
      alert("Couldn't delete account. Try again later.");
    }
  });
}

// Patch init to store currentUser
async function init() {
  const res = await fetch("/api/me", { credentials: "include" });
  if (!res.ok) {
    window.location.href = "/login.html";
    return;
  }
  currentUser = await res.json();
  userEmailEl.textContent = currentUser.email;
  userInitial = (currentUser.name || currentUser.email || "U").trim().charAt(0).toUpperCase();
  if (userNameEl) userNameEl.textContent = currentUser.name || currentUser.email.split("@")[0] || "User";
  if (userAvatarEl) userAvatarEl.textContent = userInitial;
  if (railUserInitial) railUserInitial.textContent = userInitial;

  loadingEl.style.display = "none";
  appEl.style.display = "flex";

  await loadModels();

  const urlConvoId = new URL(window.location.href).searchParams.get("c");
  if (urlConvoId) {
    await openConversation(urlConvoId);
  } else {
    await loadConversations();
  }
}

// ---------- Preferences & theme ----------
const PREFS_KEY = "aether_prefs";
function loadPrefs() {
  try {
    return Object.assign(
      { timestamps: true, enterSend: true, streamCursor: true, theme: "dark" },
      JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")
    );
  } catch {
    return { timestamps: true, enterSend: true, streamCursor: true, theme: "dark" };
  }
}
function savePrefs(p) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
let prefs = loadPrefs();

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  prefs.theme = theme === "light" ? "light" : "dark";
  savePrefs(prefs);
  const sel = document.getElementById("settings-theme");
  if (sel) sel.value = prefs.theme;
}
applyTheme(prefs.theme);

function applyTimestampVisibility() {
  document.body.classList.toggle("hide-timestamps", !prefs.timestamps);
}

const settingsTheme = document.getElementById("settings-theme");
const prefTimestamps = document.getElementById("pref-timestamps");
const prefEnterSend = document.getElementById("pref-enter-send");
const prefStreamCursor = document.getElementById("pref-stream-cursor");
const logoutHereBtn = document.getElementById("logout-here-btn");
const summarizeBtn = document.getElementById("summarize-btn");

if (settingsTheme) {
  settingsTheme.value = prefs.theme;
  settingsTheme.addEventListener("change", () => applyTheme(settingsTheme.value));
}
if (prefTimestamps) {
  prefTimestamps.checked = prefs.timestamps;
  prefTimestamps.addEventListener("change", () => {
    prefs.timestamps = prefTimestamps.checked;
    savePrefs(prefs);
    applyTimestampVisibility();
  });
}
if (prefEnterSend) {
  prefEnterSend.checked = prefs.enterSend;
  prefEnterSend.addEventListener("change", () => {
    prefs.enterSend = prefEnterSend.checked;
    savePrefs(prefs);
  });
}
if (prefStreamCursor) {
  prefStreamCursor.checked = prefs.streamCursor;
  prefStreamCursor.addEventListener("change", () => {
    prefs.streamCursor = prefStreamCursor.checked;
    savePrefs(prefs);
  });
}
if (logoutHereBtn) {
  logoutHereBtn.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login.html";
  });
}
applyTimestampVisibility();

// Streaming cursor: append a blinking caret while generating
const originalSchedule = scheduleAssistantRender;
scheduleAssistantRender = function (bubble) {
  if (prefs.streamCursor) {
    // temporary: show raw + cursor, final render strips it
    const raw = bubble.dataset.raw || "";
    bubble.innerHTML = renderMarkdown(raw, bubble.dataset.msgId) + '<span class="stream-cursor"></span>';
    scrollToBottom();
  } else {
    originalSchedule(bubble);
  }
};

// Override Enter handler for preference
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    if (prefs.enterSend) {
      e.preventDefault();
      sendMessage();
    }
  }
}, true);

// Summarize
if (summarizeBtn) {
  summarizeBtn.addEventListener("click", async () => {
    if (!activeId || streaming) return;
    summarizeBtn.disabled = true;
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: activeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Summarization failed");
        return;
      }
      addMessageBubble("assistant", "Summary of this conversation:\\n\\n" + data.summary, false);
    } catch (err) {
      alert("Summarization failed");
    } finally {
      summarizeBtn.disabled = false;
    }
  });
}

function updateSummarizeVisibility() {
  if (summarizeBtn) summarizeBtn.style.display = activeId ? "" : "none";
}

// Patch openConversation / new chat to toggle summarize button
const _openConversation = openConversation;
openConversation = async function (id) {
  await _openConversation(id);
  updateSummarizeVisibility();
};
newChatBtn.addEventListener("click", () => updateSummarizeVisibility());

// Edit last user message: double-click user bubble
messagesInner.addEventListener("dblclick", (e) => {
  const bubble = e.target.closest(".bubble.user");
  if (!bubble || streaming) return;
  const raw = bubble.dataset.raw || bubble.textContent || "";
  input.value = raw;
  input.focus();
  input.dispatchEvent(new Event("input"));
});

// ---------- Sidebar collapse (Workly-style) ----------
function setSidebarCollapsed(collapsed) {
  sidebar.classList.toggle("collapsed", collapsed);
  localStorage.setItem("aether_sidebar_collapsed", collapsed ? "1" : "0");
}
if (localStorage.getItem("aether_sidebar_collapsed") === "1" && window.innerWidth > 768) {
  setSidebarCollapsed(true);
}
if (sidebarCollapseBtn) {
  sidebarCollapseBtn.addEventListener("click", () => setSidebarCollapsed(true));
}
if (railExpandBtn) {
  railExpandBtn.addEventListener("click", () => setSidebarCollapsed(false));
}
if (railNewChat) {
  railNewChat.addEventListener("click", () => {
    setSidebarCollapsed(false);
    newChatBtn.click();
  });
}
if (railChats) {
  railChats.addEventListener("click", () => setSidebarCollapsed(false));
}
if (railSettings) {
  railSettings.addEventListener("click", () => {
    setSidebarCollapsed(false);
    openSettings();
  });
}
if (railUser) {
  railUser.addEventListener("click", () => {
    setSidebarCollapsed(false);
    openSettings();
  });
}
if (navChats) {
  navChats.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
    navChats.classList.add("active");
  });
}
// Highlight Settings nav when opening settings
const _openSettings = openSettings;
openSettings = function () {
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  if (settingsBtn) settingsBtn.classList.add("active");
  _openSettings();
};
const _closeSettings = closeSettings;
closeSettings = function () {
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  if (navChats) navChats.classList.add("active");
  _closeSettings();
};

init();
