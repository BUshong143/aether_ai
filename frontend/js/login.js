const form = document.getElementById("login-form");
const errorText = document.getElementById("error-text");
const submitBtn = document.getElementById("submit-btn");

const params = new URLSearchParams(window.location.search);
if (params.get("error") === "google_failed") {
  errorText.textContent = "Google sign-in failed. Please try again.";
}

fetch("/api/me", { credentials: "include" }).then((res) => {
  if (res.ok) window.location.href = "/chat.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorText.textContent = data.error || "Something went wrong.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
      return;
    }

    window.location.href = "/chat.html";
  } catch (err) {
    errorText.textContent = "Couldn't reach the server. Is the backend running?";
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});
