// ── UI.JS ─────────────────────────────────────────────────
// Shared helpers: number formatting, view switching, dashboard loader.
// Imported by auth, expenses, and modals.

import { apiFetchDashboard, apiFetchMonthBalanceGraph, apiFetchYearBalanceGraph } from "./api.js";

// ── NUMBER FORMATTER ───────────────────────────────────────
export function fmt(n) {
  return parseFloat(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// --- NAVBAR HELPERS ---
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function setNavbarSalary(salary) {
  const el = document.getElementById("balance-salary");
  if (!el) return;

  let value = salary;
  if (value === undefined || value === null || value === "") {
    value = getUser()?.salary ?? 0;
  }

  const num = Number(value);
  el.textContent = `$${Number.isFinite(num) ? num.toLocaleString() : "0"}`;
}

// ── VIEW SWITCHER ──────────────────────────────────────────
export function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));

  document.getElementById(viewId)?.classList.add("active");
  document.querySelector(`.sidebar-btn[data-view="${viewId}"]`)?.classList.add("active");
}

// ── DASHBOARD GRAPHS UI ────────────────────────────────────
let _monthGraphUrl = null;
let _yearGraphUrl  = null;

function ensureDashboardGraphSection() {
  const dash = document.getElementById("dashboard-view");
  if (!dash) return null;

  // If you already have a “top section” container, you can change where we insert.
  // By default, we append to the dashboard view.
  let wrap = document.getElementById("dashboard-graphs");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "dashboard-graphs";
    wrap.className = "dashboard-graphs";
    wrap.innerHTML = `
      <div class="graph-card">
        <div class="graph-card-header">
          <div class="graph-title">MONTH_BALANCE</div>
          <div class="graph-subtitle">last 30 days</div>
        </div>
        <div class="graph-body">
          <div class="graph-status" id="month-graph-status">Loading...</div>
          <img id="month-balance-img" class="graph-img" alt="Month balance graph" />
        </div>
      </div>

      <div class="graph-card">
        <div class="graph-card-header">
          <div class="graph-title">YEAR_BALANCE</div>
          <div class="graph-subtitle">last 12 months</div>
        </div>
        <div class="graph-body">
          <div class="graph-status" id="year-graph-status">Loading...</div>
          <img id="year-balance-img" class="graph-img" alt="Year balance graph" />
        </div>
      </div>
    `;
    dash.appendChild(wrap);
  }

  return wrap;
}

async function loadDashboardGraphs(email, force = false) {
  const wrap = ensureDashboardGraphSection();
  if (!wrap) return;

  const monthStatus = document.getElementById("month-graph-status");
  const yearStatus  = document.getElementById("year-graph-status");
  const monthImg    = document.getElementById("month-balance-img");
  const yearImg     = document.getElementById("year-balance-img");

  // ✅ If we already have cached images and we're not forcing, reuse them
  if (!force && _monthGraphUrl && _yearGraphUrl) {
    monthImg.src = _monthGraphUrl;
    yearImg.src  = _yearGraphUrl;
    monthStatus.textContent = "";
    yearStatus.textContent  = "";
    return;
  }

  // (existing fetch logic)
  monthStatus.textContent = "Loading...";
  yearStatus.textContent  = "Loading...";
  monthImg.removeAttribute("src");
  yearImg.removeAttribute("src");

  try {
    const [m, y] = await Promise.all([
      apiFetchMonthBalanceGraph(email),
      apiFetchYearBalanceGraph(email),
    ]);

    if (m.response.ok) {
      if (_monthGraphUrl) URL.revokeObjectURL(_monthGraphUrl);
      _monthGraphUrl = URL.createObjectURL(m.blob);
      monthImg.src = _monthGraphUrl;
      monthStatus.textContent = "";
    } else {
      monthStatus.textContent = "> ERR: FAILED_TO_LOAD";
    }

    if (y.response.ok) {
      if (_yearGraphUrl) URL.revokeObjectURL(_yearGraphUrl);
      _yearGraphUrl = URL.createObjectURL(y.blob);
      yearImg.src = _yearGraphUrl;
      yearStatus.textContent = "";
    } else {
      yearStatus.textContent = "> ERR: FAILED_TO_LOAD";
    }
  } catch {
    monthStatus.textContent = "> ERR: CONNECTION_FAILED";
    yearStatus.textContent  = "> ERR: CONNECTION_FAILED";
  }
}

// ── DASHBOARD DATA LOADER ──────────────────────────────────
export async function loadDashboard(email) {
  const { response, data } = await apiFetchDashboard(email);

  if (response.ok) {
    document.getElementById("username").textContent         = data.account_name;
    document.getElementById("balance-display").textContent  = `$${fmt(data.balance)}`;
    document.getElementById("expenses-display").textContent = `$${fmt(data.monthly_expenses)}`;
    window._currentBalance = parseFloat(data.balance) || 0;
    window._accountId      = data.account_id || null;

    // ✅ load the images whenever dashboard loads
    loadDashboardGraphs(email);
  } else {
    console.error("Failed to load dashboard data:", data.detail);
  }
}

// ── OVERLAY → APP TRANSITION ───────────────────────────────
export function showDashboard(email) {
  const overlay = document.querySelector(".screen-overlay");
  overlay.style.transition = "opacity 0.5s ease";
  overlay.style.opacity    = "0";
  setNavbarSalary(); // pulls from localStorage.user.salary

  setTimeout(() => {
    overlay.style.display = "none";

    const app = document.getElementById("app-container");
    app.style.display = "flex";
    app.classList.add("app-visible");

    // This already runs on first load; loadDashboard will now also load graphs.
    loadDashboard(email);
  }, 500);
}