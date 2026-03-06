import { apiUpdateProfileDetails, apiRequestPasswordReset, apiResetPassword } from "./api.js";
import { getEmail } from "./modals.js";
import { setNavbarSalary, invalidateDashboardCache } from "./ui.js";

let _wired = false;

function setStatus(el, msg, ok = true) {
  if (!el) return;
  el.style.display = "block";
  el.classList.remove("ok", "err");
  el.classList.add(ok ? "ok" : "err");
  el.textContent = msg;
}

/**
 * Turn any API response (object/string) into something user-friendly.
 */
function formatApiMessage(payload, fallback) {
  if (payload == null) return fallback || "";
  if (typeof payload === "string") return payload;

  // common FastAPI shapes: {detail: "..."} or {message: "..."}
  if (typeof payload === "object") {
    const d = payload.detail ?? payload.message ?? payload.msg;
    if (typeof d === "string") return d;

    // sometimes {detail: [{msg: "..."}]} (Pydantic validation)
    if (Array.isArray(payload.detail) && payload.detail.length) {
      const first = payload.detail[0];
      if (first?.msg) return String(first.msg);
    }

    try {
      return JSON.stringify(payload);
    } catch {
      return fallback || "Success.";
    }
  }

  return fallback || String(payload);
}

/**
 * Errors are thrown as Error(text). If text is JSON, extract its message.
 */
function formatApiError(err, fallback = "Request failed.") {
  const raw = err?.message ?? String(err);
  if (!raw) return fallback;

  try {
    const obj = JSON.parse(raw);
    return formatApiMessage(obj, raw);
  } catch {
    return raw;
  }
}

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function setResetModeUI() {
  const token = getTokenFromUrl();

  const btn = document.getElementById("profile-reset-btn");
  const fields = document.getElementById("profile-reset-fields");
  const status = document.getElementById("profile-reset-status");

  if (!btn || !fields) return;

  if (token) {
    btn.textContent = "Set New Password";
    fields.style.display = "grid";      // or "block" if you prefer
    if (status) setStatus(status, "Token detected. Enter a new password.", true);
  } else {
    btn.textContent = "Send Reset Link";
    fields.style.display = "none";
    // optional: hide status when no token
    if (status) status.style.display = "none";
  }
}

export function initProfile() {
  if (_wired) return;
  _wired = true;

  // Keep UI in sync if user lands with ?token=...
  setResetModeUI();
  window.addEventListener("popstate", setResetModeUI);

  document.addEventListener("click", async (e) => {

    /* =========================
       SAVE PROFILE
    ========================== */
    const saveBtn = e.target.closest("#save-profile");
  if (saveBtn) {
  e.preventDefault?.(); // prevent form submit reload

  const statusEl = document.getElementById("profile-status");

  try {
    const old_email = getEmail();
    if (!old_email) throw new Error("No user email found.");

    const full_name =
      (document.getElementById("profile-name")?.value || "").trim();

    const email =
      (document.getElementById("profile-email")?.value || "").trim();

    const salaryRaw =
      document.getElementById("profile-salary")?.value;

    const salary =
      salaryRaw === "" || salaryRaw == null
        ? null
        : Number(String(salaryRaw).replace(/,/g, ""));

    // Call API first
    const updated = await apiUpdateProfileDetails(
      old_email,
      full_name,
      email,
      salary
    );

    // Merge into localStorage safely
    const prev = JSON.parse(localStorage.getItem("user") || "{}");

    const merged = {
      ...prev,
      ...(updated || {}),
      email: updated?.email ?? email ?? prev.email,
      account_name:
        updated?.account_name ??
        updated?.accountName ??
        prev.account_name,
      salary: updated?.salary ?? salary ?? prev.salary,
    };

    localStorage.setItem("user", JSON.stringify(merged));

    // Now update UI + cache
    invalidateDashboardCache();

    if (merged?.salary != null) {
      setNavbarSalary(merged.salary);
    }

    setStatus(statusEl, "Profile updated ✅", true);

  } catch (err) {
    console.error("Profile update error:", err);
    setStatus(
      statusEl,
      `Update failed: ${formatApiError(err)}`,
      false
    );
  }
}

    /* =========================
       RESET PASSWORD
    ========================== */
    const resetBtn = e.target.closest("#profile-reset-btn");
    if (resetBtn) {
      e.preventDefault?.();

      const resetStatus = document.getElementById("profile-reset-status");
      const token = getTokenFromUrl();

      try {
        // Step 1: request reset email
        if (!token) {
          const email = getEmail();
          if (!email) throw new Error("No user email found.");

          const redirectTo =
            `${window.location.origin}${window.location.pathname}`;

          const payload =
            await apiRequestPasswordReset(email, redirectTo);

          setStatus(
            resetStatus,
            `✅ ${formatApiMessage(
              payload,
              "Reset email sent. Check your inbox 📩"
            )}`,
            true
          );

          return;
        }

        // Step 2: token present → reset password
        const p1 = document.getElementById("profile-reset-password")?.value || "";
        const p2 = document.getElementById("profile-reset-confirm")?.value || "";

        if (p1.length < 8)
          throw new Error("Password must be at least 8 characters.");

        if (p1 !== p2)
          throw new Error("Passwords do not match.");

        const payload = await apiResetPassword(token, p1);

        setStatus(
          resetStatus,
          `✅ ${formatApiMessage(
            payload,
            "Password updated. You can now log in."
          )}`,
          true
        );

        // Remove token from URL
        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        const newUrl =
          `${window.location.pathname}${
            params.toString() ? "?" + params.toString() : ""
          }`;

        window.history.replaceState({}, "", newUrl);
        setResetModeUI();

      } catch (err) {
        console.error("Reset error:", err);
        setStatus(
          resetStatus,
          `Reset failed: ${formatApiError(err)}`,
          false
        );
      }
    }

  });
}