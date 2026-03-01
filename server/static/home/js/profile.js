import { apiUpdateProfileDetails, apiRequestPasswordReset, apiResetPassword } from "./api.js";
import { getEmail } from "./modals.js";
import { setNavbarSalary } from "./ui.js";

let _wired = false;

function setStatus(el, msg, ok = true) {
  if (!el) return;
  el.style.display = "block";
  el.classList.remove("ok", "err");
  el.classList.add(ok ? "ok" : "err");
  el.textContent = msg;
}

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

function setResetModeUI() {
  const token = getTokenFromUrl();

  const resetBtn = document.getElementById("reset-btn");
  const resetFields = document.getElementById("reset-fields"); // wrapper in HTML
  const resetStatus = document.getElementById("reset-status");

  if (!resetBtn || !resetFields) return;

  if (token) {
    resetBtn.textContent = "Set New Password";
    resetFields.style.display = "grid";
    setStatus(resetStatus, "Token detected. Set your new password below.", true);
  } else {
    resetBtn.textContent = "Send Reset Link";
    resetFields.style.display = "none"; // hide password inputs until token exists
  }
}

export function initProfile() {
  if (_wired) return;
  _wired = true;

  // Keep UI in sync if user lands with ?token=...
  setResetModeUI();
  window.addEventListener("popstate", setResetModeUI);

  document.addEventListener("click", async (e) => {
    // SAVE PROFILE
    const saveBtn = e.target.closest("#save-profile");
    if (saveBtn) {
      const status = document.getElementById("profile-status");
      const fullNameInput = document.getElementById("profile-name");
      const emailInput = document.getElementById("profile-email");
      const salaryInput = document.getElementById("profile-salary");

      try {
        const old_email = getEmail();
        if (!old_email) throw new Error("No user email found (localStorage user missing).");

        const full_name = (fullNameInput?.value || "").trim();
        const email = (emailInput?.value || "").trim();

        // normalize salary
        const salaryRaw = salaryInput?.value;
        const salary =
          salaryRaw === "" || salaryRaw === undefined || salaryRaw === null ? null : Number(salaryRaw);

        const updated = await apiUpdateProfileDetails(old_email, full_name, email, salary);

        // Always merge updated fields into localStorage (but don't overwrite with undefined/null)
        const prev = JSON.parse(localStorage.getItem("user") || "{}");
        const merged = {
          ...prev,
          ...(updated || {}),
          email: updated?.email ?? prev.email,
          salary: updated?.salary ?? salary ?? prev.salary,
        };

        localStorage.setItem("user", JSON.stringify(merged));

        // ✅ Immediately update navbar salary
        setNavbarSalary(merged.salary);

        setStatus(status, "Saved successfully ✅", true);
      } catch (err) {
        setStatus(status, `Save failed: ${err.message}`, false);
      }
      return;
    }

    // PASSWORD RESET BUTTON
    const resetBtn = e.target.closest("#reset-btn");
    if (resetBtn) {
      const resetStatus = document.getElementById("reset-status");
      const token = getTokenFromUrl();

      try {
        if (!token) {
          // Step 1: request reset link
          const email = getEmail();
          if (!email) throw new Error("No user email found (localStorage user missing).");

          // IMPORTANT: keep redirectTo minimal + same-origin
          const redirectTo = `${window.location.origin}${window.location.pathname}`;
          console.log("Password reset redirectTo:", redirectTo);

          await apiRequestPasswordReset(email, redirectTo);
          setStatus(resetStatus, "Reset email sent. Check your inbox 📩", true);
          return;
        }

        // Step 2: user opened email link with ?token=...
        const p1 = document.getElementById("reset-password")?.value || "";
        const p2 = document.getElementById("reset-confirm")?.value || "";

        if (p1.length < 8) throw new Error("Password must be at least 8 characters.");
        if (p1 !== p2) throw new Error("Passwords do not match.");

        await apiResetPassword(token, p1);
        setStatus(resetStatus, "Password updated ✅ You can now log in.", true);

        // clear token from URL + hide password fields again
        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
        window.history.replaceState({}, "", newUrl);
        setResetModeUI();
      } catch (err) {
        setStatus(resetStatus, `Reset failed: ${err.message}`, false);
      }
    }
  });
}