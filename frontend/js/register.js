const form = document.getElementById("register-form");
const errorText = document.getElementById("error-text");
const submitBtn = document.getElementById("submit-btn");
const passwordInput = document.getElementById("password");

const CHECK_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const X_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const SPECIAL_CHARS_RE = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?`~\\]/;

function checkPasswordStrength(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: SPECIAL_CHARS_RE.test(password),
  };
}

function updatePasswordChecklist() {
  const results = checkPasswordStrength(passwordInput.value);
  let allMet = true;
  document.querySelectorAll("#password-requirements .requirement-item").forEach((item) => {
    const met = results[item.dataset.req];
    if (!met) allMet = false;
    item.classList.toggle("met", met);
    item.classList.toggle("unmet", !met);
    item.querySelector(".req-icon").innerHTML = met ? CHECK_ICON : X_ICON;
  });
  return allMet;
}

passwordInput.addEventListener("input", updatePasswordChecklist);
updatePasswordChecklist();

fetch("/api/me", { credentials: "include" }).then((res) => {
  if (res.ok) window.location.href = "/chat.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.textContent = "";

  if (!updatePasswordChecklist()) {
    errorText.textContent = "Please meet all password requirements above.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = passwordInput.value;

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorText.textContent = data.error || "Something went wrong.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
      return;
    }

    window.location.href = "/chat.html";
  } catch (err) {
    errorText.textContent = "Couldn't reach the server. Is the backend running?";
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});
