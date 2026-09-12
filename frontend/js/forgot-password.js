const steps = {
  email: document.getElementById("step-email"),
  otp: document.getElementById("step-otp"),
  password: document.getElementById("step-password"),
  done: document.getElementById("step-done"),
};

function showStep(name) {
  Object.values(steps).forEach((el) => el.classList.remove("active"));
  steps[name].classList.add("active");
}

let userEmail = "";
let resetToken = "";
let resendCooldown = 0;
let resendTimer = null;

const emailForm = document.getElementById("email-form");
const emailInput = document.getElementById("email");
const emailError = document.getElementById("email-error");
const emailSubmit = document.getElementById("email-submit");

async function requestOtp(email) {
  const res = await fetch("/api/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  emailError.textContent = "";
  emailSubmit.disabled = true;
  emailSubmit.textContent = "Sending…";

  const email = emailInput.value.trim();

  try {
    await requestOtp(email);
    userEmail = email;
    document.getElementById("otp-email-display").textContent = email;
    otpInputs[0].value = "";
    otpInputs.forEach((input) => (input.value = ""));
    document.getElementById("otp-error").textContent = "";
    document.getElementById("otp-success").textContent = "";
    showStep("otp");
    otpInputs[0].focus();
    startResendCooldown();
  } catch (err) {
    emailError.textContent = err.message || "Couldn't reach the server.";
  } finally {
    emailSubmit.disabled = false;
    emailSubmit.textContent = "Send code";
  }
});

const otpForm = document.getElementById("otp-form");
const otpInputs = Array.from(document.querySelectorAll("#otp-inputs input"));
const otpError = document.getElementById("otp-error");
const otpSuccess = document.getElementById("otp-success");
const otpSubmit = document.getElementById("otp-submit");
const resendBtn = document.getElementById("resend-btn");
const otpBack = document.getElementById("otp-back");

otpInputs.forEach((input, i) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);
    if (input.value && i < otpInputs.length - 1) {
      otpInputs[i + 1].focus();
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && i > 0) {
      otpInputs[i - 1].focus();
    }
  });
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const digits = (e.clipboardData.getData("text") || "").replace(/[^0-9]/g, "").split("");
    digits.slice(0, otpInputs.length).forEach((d, idx) => {
      if (otpInputs[idx]) otpInputs[idx].value = d;
    });
    const next = Math.min(digits.length, otpInputs.length - 1);
    otpInputs[next].focus();
  });
});

otpBack.addEventListener("click", () => {
  showStep("email");
  emailError.textContent = "";
  clearInterval(resendTimer);
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  otpError.textContent = "";
  otpSuccess.textContent = "";
  const code = otpInputs.map((input) => input.value).join("");

  if (code.length !== 6) {
    otpError.textContent = "Enter the full 6-digit code.";
    return;
  }

  otpSubmit.disabled = true;
  otpSubmit.textContent = "Verifying…";

  try {
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: userEmail, otp: code }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Invalid or expired code.");
    }

    resetToken = data.resetToken;
    
    document.getElementById("password-error").textContent = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    updatePasswordChecklist();
    showStep("password");
    document.getElementById("new-password").focus();
  } catch (err) {
    otpError.textContent = err.message || "Couldn't reach the server.";
  } finally {
    otpSubmit.disabled = false;
    otpSubmit.textContent = "Verify code";
  }
});

function startResendCooldown() {
  resendCooldown = 30;
  resendBtn.disabled = true;
  updateResendLabel();
  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    resendCooldown -= 1;
    updateResendLabel();
    if (resendCooldown <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend code";
    }
  }, 1000);
}

function updateResendLabel() {
  resendBtn.textContent = resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code";
}

resendBtn.addEventListener("click", async () => {
  if (resendBtn.disabled) return;
  otpError.textContent = "";
  try {
    await requestOtp(userEmail);
    otpSuccess.textContent = "A new code has been sent.";
    startResendCooldown();
  } catch (err) {
    otpError.textContent = err.message || "Couldn't reach the server.";
  }
});

const passwordForm = document.getElementById("password-form");
const passwordError = document.getElementById("password-error");
const passwordSubmit = document.getElementById("password-submit");
const newPasswordInput = document.getElementById("new-password");

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
  const results = checkPasswordStrength(newPasswordInput.value);
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

newPasswordInput.addEventListener("input", updatePasswordChecklist);

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  passwordError.textContent = "";

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!updatePasswordChecklist()) {
    passwordError.textContent = "Please meet all password requirements above.";
    return;
  }
  if (newPassword !== confirmPassword) {
    passwordError.textContent = "Passwords don't match.";
    return;
  }

  passwordSubmit.disabled = true;
  passwordSubmit.textContent = "Saving…";

  try {
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: userEmail, resetToken, password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    showStep("done");
  } catch (err) {
    passwordError.textContent = err.message || "Couldn't reach the server.";
  } finally {
    passwordSubmit.disabled = false;
    passwordSubmit.textContent = "Reset password";
  }
});
