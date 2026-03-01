// ── AUTH.JS ───────────────────────────────────────────────
// Handles: login form, signup form, post-signup setup,
//          auto-login on page load, logout, profile nav button.

import { apiLogin, apiSignup, apiSetupAccount } from "./api.js";
import {loadDashboard, showDashboard, switchView} from "./ui.js";

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
    document.getElementById("submit-login").addEventListener("click", async (e) => {
        e.preventDefault();

        const email     = document.getElementById("login-email").value;
        const password  = document.getElementById("login-password").value;
        const statusEl  = document.getElementById("login-status");
        const btn       = document.getElementById("submit-login");

        if (!email || !password) {
            statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
            statusEl.className   = "status-line";
            return;
        }

        btn.disabled         = true;
        statusEl.textContent = "> AUTHENTICATING...";
        statusEl.className   = "status-line ok";

        try {
            const { response, data } = await apiLogin(email, password);

            if (response.ok) {
                localStorage.setItem("access_token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                statusEl.textContent = "> ACCESS GRANTED. LOADING...";
                statusEl.className   = "status-line ok";
                setTimeout(() => showDashboard(email), 800);
            } else {
                statusEl.textContent = `> ERR: ${data.detail || "AUTH FAILED"}`.toUpperCase();
                statusEl.className   = "status-line";
            }
        } catch {
            statusEl.textContent = "> ERR: CONNECTION FAILED";
            statusEl.className   = "status-line";
        } finally {
            btn.disabled = false;
        }
    });
}

// ── SIGNUP ─────────────────────────────────────────────────
function initSignup() {
    document.getElementById("submit-signup").addEventListener("click", async (e) => {
        e.preventDefault();

        const email    = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const name     = document.getElementById("name").value;
        const statusEl = document.getElementById("signup-status");
        const btn      = document.getElementById("submit-signup");

        if (!name || !email || !password) {
            statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
            statusEl.className   = "status-line";
            return;
        }

        btn.disabled         = true;
        statusEl.textContent = "> CONNECTING...";
        statusEl.className   = "status-line ok";

        try {
            const { response, data } = await apiSignup(email, password, name);

            if (response.ok) {
                localStorage.setItem("access_token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                statusEl.textContent = "> ACCOUNT CREATED. LOADING...";
                statusEl.className   = "status-line ok";

                setTimeout(() => {
                    document.getElementById("signup-form").classList.remove("active");
                    document.getElementById("signup-form").style.display = "none";
                    document.getElementById("form-title").innerHTML = 'SETUP_<span class="cursor">█</span>';
                    document.getElementById("new-username").textContent = name;
                    document.getElementById("new-email").value          = email;

                    const postSignup = document.getElementById("post-signup");
                    postSignup.style.display = "block";
                    postSignup.classList.add("ps-visible");
                }, 600);
            } else {
                statusEl.textContent = `> ERR: ${data.detail || "SIGNUP FAILED"}`.toUpperCase();
                statusEl.className   = "status-line";
            }
        } catch {
            statusEl.textContent = "> ERR: CONNECTION FAILED";
            statusEl.className   = "status-line";
        } finally {
            btn.disabled = false;
        }
    });
}

// ── POST-SIGNUP SETUP ──────────────────────────────────────
function initPostSignup() {
    document.getElementById("submit-new-details").addEventListener("click", async (e) => {
        e.preventDefault();

        const balance  = document.getElementById("balance").value;
        const fullName = document.getElementById("Full-name").value;
        const newEmail = document.getElementById("new-email").value;
        const btn      = document.getElementById("submit-new-details");

        let statusEl = document.getElementById("new-details-status");
        if (!statusEl) {
            statusEl    = document.createElement("div");
            statusEl.id = "new-details-status";
            document.getElementById("new-details").insertBefore(statusEl, btn);
        }

        if (!balance || !fullName || !newEmail) {
            statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
            statusEl.className   = "status-line";
            return;
        }

        btn.disabled         = true;
        statusEl.textContent = "> SAVING PROFILE...";
        statusEl.className   = "status-line ok";

        try {
            const { response, data } = await apiSetupAccount(balance, fullName, newEmail);

            if (response.ok) {
                statusEl.textContent = "> PROFILE SAVED. ENTERING SYSTEM...";
                statusEl.className   = "status-line ok";
                setTimeout(() => showDashboard(newEmail), 800);
            } else {
                statusEl.textContent = `> ERR: ${data.detail || "SAVE FAILED"}`.toUpperCase();
                statusEl.className   = "status-line";
            }
        } catch {
            statusEl.textContent = "> ERR: CONNECTION FAILED";
            statusEl.className   = "status-line";
        } finally {
            btn.disabled = false;
        }
    });
}

// ── AUTO-LOGIN ON REFRESH ──────────────────────────────────
function initAutoLogin() {
    const token = localStorage.getItem("access_token");
    const user  = JSON.parse(localStorage.getItem("user"));
    if (token && user?.email) showDashboard(user.email);
}

// ── LOGOUT & PROFILE BUTTON ────────────────────────────────
function initNavButtons() {
    document.addEventListener("click", (e) => {
        const user  = JSON.parse(localStorage.getItem("user"));
        const email = user?.email;

        // ── Sidebar dashboard button ───────────────────────
        // The dashboard sidebar btn has no id — match it by data-view
        const sideBtn = e.target.closest(".sidebar-btn");
        if (sideBtn?.dataset.view === "dashboard-view") {
            switchView("dashboard-view");
            if (email) loadDashboard(email);
            return;
        }

        // ── Navbar buttons (profile, logout) ──────────────
        const btn = e.target.closest("#profile-btn, #logout-btn");
        if (!btn) return;

        if (btn.id === "profile-btn") {
            switchView("profile-view");
            if (user) {
                const nameEl = document.getElementById("profile-name");
                const emailEl = document.getElementById("profile-email");
                if (nameEl) nameEl.value = user.full_name || user.name || "";
                if (emailEl) emailEl.value = email || "";
                const salEl = document.getElementById("profile-salary");
                if (salEl) salEl.value = user.salary ?? "";
            }
        }
        else if (btn.id === "logout-btn") {
            localStorage.clear();
            location.reload();
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
}