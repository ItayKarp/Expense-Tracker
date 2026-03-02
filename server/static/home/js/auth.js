// ── AUTH.JS ───────────────────────────────────────────────
// Handles: login form, signup form, post-signup setup,
//          auto-login on page load, logout, profile nav button.

import { apiLogin, apiSignup, apiSetupAccount, apiRequestPasswordReset, apiResetPassword } from "./api.js";
import { loadDashboard, showDashboard, switchView } from "./ui.js";

// ── FORM TOGGLE ────────────────────────────────────────────
function initFormToggle() {
  document.getElementById("to-signup").addEventListener("click", () => {
    document.getElementById("login-form").classList.remove("active");
    document.getElementById("signup-form").classList.add("active");
    document.getElementById("form-title").innerHTML = 'SIGN_UP<span class="cursor">█</span>';
    document.getElementById("signup-status").textContent = "";
  });

  document.getElementById("to-login").addEventListener("click", () => {
    document.getElementById("signup-form").classList.remove("active");
    document.getElementById("login-form").classList.add("active");
    document.getElementById("form-title").innerHTML = 'SIGN_IN<span class="cursor">█</span>';
    document.getElementById("login-status").textContent = "";
  });
}

// ── LOGIN ──────────────────────────────────────────────────
function initLogin() {
  const loginForm = document.getElementById("login-form");

  // ✅ FIX: Prevent native form submit (ENTER) from reloading the page.
  // Route ENTER to the right action:
  // - If forgot panel is visible => SEND LINK
  // - Else => LOGIN
  if (loginForm && !loginForm.dataset.submitHooked) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const wrap = document.createElement("div");
      wrap.id = "forgot-reset-wrap";
      wrap.className = "auth-form";   // ✅ inherit column layout + gap automatically
      wrap.style.display = "none";
      const forgotOpen = !!(wrap && wrap.style.display && wrap.style.display !== "none");

      if (forgotOpen) {
        document.getElementById("submit-forgot")?.click();
      } else {
        document.getElementById("submit-login")?.click();
      }
    });

    loginForm.dataset.submitHooked = "true";
  }

  document.getElementById("submit-login").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const statusEl = document.getElementById("login-status");
    const btn = document.getElementById("submit-login");

    if (!email || !password) {
      statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
      statusEl.className = "status-line";
      return;
    }

    btn.disabled = true;
    statusEl.textContent = "> AUTHENTICATING...";
    statusEl.className = "status-line ok";

    try {
      const { response, data } = await apiLogin(email, password);

      if (response.ok) {
        localStorage.setItem("access_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        statusEl.textContent = "> ACCESS GRANTED. LOADING...";
        statusEl.className = "status-line ok";
        setTimeout(() => showDashboard(email), 800);
      } else {
        statusEl.textContent = `> ERR: ${data.detail || "AUTH FAILED"}`.toUpperCase();
        statusEl.className = "status-line";
      }
    } catch {
      statusEl.textContent = "> ERR: CONNECTION FAILED";
      statusEl.className = "status-line";
    } finally {
      btn.disabled = false;
    }
  });
}

// ── SIGNUP ─────────────────────────────────────────────────
function initSignup() {
  const signupForm = document.getElementById("signup-form");

  // ✅ Prevent native submit refresh if signup-form is a real <form>
  if (signupForm && signupForm.tagName === "FORM" && !signupForm.dataset.submitHooked) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      document.getElementById("submit-signup")?.click();
    });
    signupForm.dataset.submitHooked = "true";
  }

  document.getElementById("submit-signup").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const name = document.getElementById("name").value;
    const statusEl = document.getElementById("signup-status");
    const btn = document.getElementById("submit-signup");

    if (!name || !email || !password) {
      statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
      statusEl.className = "status-line";
      return;
    }

    btn.disabled = true;
    statusEl.textContent = "> CONNECTING...";
    statusEl.className = "status-line ok";

    try {
      const { response, data } = await apiSignup(email, password, name);

      if (response.ok) {
        localStorage.setItem("access_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        statusEl.textContent = "> ACCOUNT CREATED. LOADING...";
        statusEl.className = "status-line ok";

        setTimeout(() => {
          document.getElementById("signup-form").classList.remove("active");
          document.getElementById("signup-form").style.display = "none";
          document.getElementById("form-title").innerHTML = 'SETUP_<span class="cursor">█</span>';
          document.getElementById("new-username").textContent = name;
          document.getElementById("new-email").value = email;

          const postSignup = document.getElementById("post-signup");
          postSignup.style.display = "block";
          postSignup.classList.add("ps-visible");
        }, 600);
      } else {
        statusEl.textContent = `> ERR: ${data.detail || "SIGNUP FAILED"}`.toUpperCase();
        statusEl.className = "status-line";
      }
    } catch {
      statusEl.textContent = "> ERR: CONNECTION FAILED";
      statusEl.className = "status-line";
    } finally {
      btn.disabled = false;
    }
  });
}

// ── POST-SIGNUP SETUP ──────────────────────────────────────
function initPostSignup() {
  const newDetails = document.getElementById("new-details");

  // ✅ Prevent native submit refresh if new-details is a real <form>
  if (newDetails && newDetails.tagName === "FORM" && !newDetails.dataset.submitHooked) {
    newDetails.addEventListener("submit", (e) => {
      e.preventDefault();
      document.getElementById("submit-new-details")?.click();
    });
    newDetails.dataset.submitHooked = "true";
  }

  document.getElementById("submit-new-details").addEventListener("click", async (e) => {
    e.preventDefault();

    const balance = document.getElementById("balance").value;
    const fullName = document.getElementById("Full-name").value;
    const newEmail = document.getElementById("new-email").value;
    const btn = document.getElementById("submit-new-details");

    let statusEl = document.getElementById("new-details-status");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "new-details-status";
      document.getElementById("new-details").insertBefore(statusEl, btn);
    }

    if (!balance || !fullName || !newEmail) {
      statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
      statusEl.className = "status-line";
      return;
    }

    btn.disabled = true;
    statusEl.textContent = "> SAVING PROFILE...";
    statusEl.className = "status-line ok";

    try {
      const { response, data } = await apiSetupAccount(balance, fullName, newEmail);

      if (response.ok) {
        statusEl.textContent = "> PROFILE SAVED. ENTERING SYSTEM...";
        statusEl.className = "status-line ok";
        setTimeout(() => showDashboard(newEmail), 800);
      } else {
        statusEl.textContent = `> ERR: ${data.detail || "SAVE FAILED"}`.toUpperCase();
        statusEl.className = "status-line";
      }
    } catch {
      statusEl.textContent = "> ERR: CONNECTION FAILED";
      statusEl.className = "status-line";
    } finally {
      btn.disabled = false;
    }
  });
}

// ── AUTO-LOGIN ON REFRESH ──────────────────────────────────
function initAutoLogin() {
  const token = localStorage.getItem("access_token");
  const user = JSON.parse(localStorage.getItem("user"));
  if (token && user?.email) showDashboard(user.email);
}

// ── LOGOUT & PROFILE BUTTON ────────────────────────────────
function initNavButtons() {
  document.addEventListener("click", (e) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const email = user?.email;

    const sideBtn = e.target.closest(".sidebar-btn");

    // ── DASHBOARD BUTTON ───────────────────────────────
    if (sideBtn?.dataset.view === "dashboard-view") {
      const dashView = document.getElementById("dashboard-view");

      // ✅ If already active → do nothing (no API call)
      if (dashView?.classList.contains("active")) {
        return;
      }

      switchView("dashboard-view");

      // Load only once (ui.js cache prevents refetch unless forced)
      if (email) loadDashboard(email);

      return;
    }

    // ── PROFILE / LOGOUT ───────────────────────────────
    const btn = e.target.closest("#profile-btn, #logout-btn");
    if (!btn) return;

    if (btn.id === "profile-btn") {
      switchView("profile-view");

      if (user) {
        const nameEl = document.getElementById("profile-name");
        const emailEl = document.getElementById("profile-email");
        const salEl = document.getElementById("profile-salary");

        if (nameEl) nameEl.value = user.full_name || user.name || "";
        if (emailEl) emailEl.value = email || "";
        if (salEl) salEl.value = user.salary ?? "";
      }

    } else if (btn.id === "logout-btn") {
      localStorage.clear();
      location.reload();
    }
  });
}

// ── FORGOT / RESET PASSWORD (LOGIN TERMINAL) ───────────────
// Works in 2 modes:
// 1) Forgot: user enters email -> calls /auth/request-password-reset
// 2) Reset: user arrives with ?token=... -> sets new password -> calls /auth/reset-password

function getResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function setTerminalStatus(el, msg, ok = false) {
  if (!el) return;
  el.textContent = msg;
  el.className = ok ? "status-line ok" : "status-line";
}

function ensureForgotResetUI() {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  // Prevent double-inject
  if (document.getElementById("forgot-reset-wrap")) return;

  // Insert a "FORGOT_PASS" button next to REGISTER_NOW (matches terminal style)
  const toggleRow = loginForm.querySelector(".toggle-row");
  if (toggleRow) {
    const forgotBtn = document.createElement("button");
    forgotBtn.type = "button";
    forgotBtn.id = "to-forgot";
    forgotBtn.className = "toggle-btn";
    forgotBtn.textContent = "FORGOT_PASS";
    toggleRow.appendChild(document.createTextNode(" · "));
    toggleRow.appendChild(forgotBtn);
  }

  // Create the wrapper (hidden by default)
  const wrap = document.createElement("div");
  wrap.id = "forgot-reset-wrap";
  wrap.style.display = "none";
  wrap.innerHTML = `
    <div class="field-row">
      <span class="prompt">&gt; MAIL_:</span>
      <input type="email" id="forgot-email" placeholder="user@domain.com" autocomplete="off">
    </div>

    <div id="forgot-reset-status" class="status-line"></div>

    <button type="button" id="submit-forgot" class="btn-submit">[ SEND LINK ]</button>

    <div class="toggle-row" style="margin-top:0.25em;">
      <span>Back to login?</span>
      <button type="button" id="back-to-login" class="toggle-btn">SIGN_IN</button>
    </div>
  `;

  // Put it right before the login submit button
  const submitLoginBtn = document.getElementById("submit-login");
  if (submitLoginBtn) {
    loginForm.insertBefore(wrap, submitLoginBtn);
  } else {
    loginForm.appendChild(wrap);
  }

  // Create a separate RESET form (shown only when token exists)
  const resetForm = document.createElement("form");
  resetForm.id = "reset-form";
  resetForm.className = "auth-form";
  resetForm.action = "";
  resetForm.style.display = "none";
  resetForm.innerHTML = `
    <div class="field-row">
      <span class="prompt">&gt; NEWPASS_:</span>
      <input type="password" id="reset-newpass" placeholder="••••••••">
    </div>
    <div class="field-row">
      <span class="prompt">&gt; CONFIRM_:</span>
      <input type="password" id="reset-confirm" placeholder="••••••••">
    </div>

    <div class="status-line" id="reset-status"></div>

    <button type="submit" id="submit-reset" class="btn-submit">[ SET PASSWORD ]</button>

    <div class="toggle-row" style="margin-top:0.25em;">
      <span>Back to login?</span>
      <button type="button" id="reset-back-login" class="toggle-btn">SIGN_IN</button>
    </div>
  `;

  // Insert reset form after login form so it sits in the same terminal area
  loginForm.parentElement?.appendChild(resetForm);
}

function showForgotPanel() {
  const wrap = document.getElementById("forgot-reset-wrap");
  const loginForm = document.getElementById("login-form");

  if (!wrap || !loginForm) return;

  // Hide EVERYTHING in login form except the forgot wrapper
  [...loginForm.children].forEach((child) => {
    if (child.id !== "forgot-reset-wrap") {
      child.dataset._prevDisplay = child.style.display || "";
      child.style.display = "none";
    }
  });

  // Show forgot wrapper
  wrap.style.display = "flex";

  // Pre-fill from login email if present
  const loginEmail = document.getElementById("login-email")?.value || "";
  const forgotEmail = document.getElementById("forgot-email");
  if (forgotEmail && !forgotEmail.value) forgotEmail.value = loginEmail;

  const statusEl = document.getElementById("forgot-reset-status");
  setTerminalStatus(statusEl, "> ENTER EMAIL TO RECEIVE RESET LINK", true);
}

function hideForgotPanel() {
  const wrap = document.getElementById("forgot-reset-wrap");
  const loginForm = document.getElementById("login-form");

  if (!wrap || !loginForm) return;

  // Hide forgot wrapper
  wrap.style.display = "none";

  // Restore everything we hid
  [...loginForm.children].forEach((child) => {
    if (child.id !== "forgot-reset-wrap") {
      child.style.display = child.dataset._prevDisplay || "";
      delete child.dataset._prevDisplay;
    }
  });
}

function showResetForm() {
  // Switch title to reset mode
  const title = document.getElementById("form-title");
  if (title) title.innerHTML = 'RESET_PASS<span class="cursor">█</span>';

  // Hide login/signup, show reset
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const resetForm = document.getElementById("reset-form");

  loginForm?.classList.remove("active");
  signupForm?.classList.remove("active");
  if (loginForm) loginForm.style.display = "none";
  if (signupForm) signupForm.style.display = "none";

  if (resetForm) {
    resetForm.style.display = "flex";
    resetForm.classList.add("active");
  }

  const statusEl = document.getElementById("reset-status");
  setTerminalStatus(statusEl, "> TOKEN DETECTED. SET A NEW PASSWORD.", true);
}

function hideResetFormBackToLogin() {
  const title = document.getElementById("form-title");
  if (title) title.innerHTML = 'SIGN_IN<span class="cursor">█</span>';

  const loginForm = document.getElementById("login-form");
  const resetForm = document.getElementById("reset-form");

  if (resetForm) {
    resetForm.classList.remove("active");
    resetForm.style.display = "none";
  }

  if (loginForm) {
    loginForm.style.display = "";
    loginForm.classList.add("active");
  }

  // remove token from URL (clean)
  const params = new URLSearchParams(window.location.search);
  params.delete("token");
  const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
  window.history.replaceState({}, "", newUrl);
}

function initForgotAndResetPassword() {
  ensureForgotResetUI();

  // If the user lands here from the email link (Neon appends ?token=...)
  const token = getResetTokenFromUrl();
  if (token) {
    showResetForm();
  }

  document.addEventListener("click", async (e) => {
    // Open forgot panel
    const toForgot = e.target.closest("#to-forgot");
    if (toForgot) {
      showForgotPanel();
      return;
    }

    // Back to login from forgot panel
    const backToLogin = e.target.closest("#back-to-login");
    if (backToLogin) {
      hideForgotPanel();
      const statusEl = document.getElementById("login-status");
      if (statusEl) statusEl.textContent = "";
      return;
    }

    // Back to login from reset form
    const resetBack = e.target.closest("#reset-back-login");
    if (resetBack) {
      hideResetFormBackToLogin();
      return;
    }

    // Submit forgot request
    const submitForgot = e.target.closest("#submit-forgot");
    if (submitForgot) {
      const email = (document.getElementById("forgot-email")?.value || "").trim();
      const statusEl = document.getElementById("forgot-reset-status");

      if (!email) {
        setTerminalStatus(statusEl, "> ERR: EMAIL REQUIRED", false);
        return;
      }

      submitForgot.disabled = true;
      setTerminalStatus(statusEl, "> SENDING RESET LINK...", true);

      try {
        // Make redirect go back to the SAME page; Neon will append ?token=...
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        await apiRequestPasswordReset(email, redirectTo);
        setTerminalStatus(statusEl, "> RESET EMAIL SENT. CHECK INBOX 📩", true);
      } catch (err) {
        setTerminalStatus(statusEl, `> ERR: ${String(err?.message || err)}`.toUpperCase(), false);
      } finally {
        submitForgot.disabled = false;
      }
    }
  });

  // Reset password submit (token mode)
  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("#reset-form");
    if (!form) return;

    e.preventDefault();

    const token = getResetTokenFromUrl();
    const p1 = document.getElementById("reset-newpass")?.value || "";
    const p2 = document.getElementById("reset-confirm")?.value || "";
    const statusEl = document.getElementById("reset-status");
    const btn = document.getElementById("submit-reset");

    if (!token) {
      setTerminalStatus(statusEl, "> ERR: MISSING TOKEN", false);
      return;
    }

    if (p1.length < 8) {
      setTerminalStatus(statusEl, "> ERR: PASSWORD MIN 8 CHARS", false);
      return;
    }
    if (p1 !== p2) {
      setTerminalStatus(statusEl, "> ERR: PASSWORDS DO NOT MATCH", false);
      return;
    }

    btn.disabled = true;
    setTerminalStatus(statusEl, "> UPDATING PASSWORD...", true);

    try {
      await apiResetPassword(token, p1);
      setTerminalStatus(statusEl, "> PASSWORD UPDATED ✅ YOU CAN LOG IN NOW.", true);

      // Clean URL + go back to login after a moment
      setTimeout(() => {
        hideResetFormBackToLogin();
      }, 800);
    } catch (err) {
      setTerminalStatus(statusEl, `> ERR: ${String(err?.message || err)}`.toUpperCase(), false);
    } finally {
      btn.disabled = false;
    }
  });
}

// ── INIT ───────────────────────────────────────────────────
export function initAuth() {
  initFormToggle();
  initLogin();
  initSignup();
  initPostSignup();
  initAutoLogin();
  initNavButtons();
  initForgotAndResetPassword();
}