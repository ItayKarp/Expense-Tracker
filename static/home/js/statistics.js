import {
  apiFetchStatistics,
  apiFetchIncomeVsExpensesGraph,
  apiFetchExpensesByCategoryGraph,
  apiFetchExpensesByMonthsGraph,
} from "./api.js";
import { switchView, setNavbarSalary } from "./ui.js";

/* ─────────────────────────────────────────────────────────
   FRONTEND CACHE
   - Avoid re-requesting on every click into Statistics
   - TTL-based so it refreshes periodically
────────────────────────────────────────────────────────── */

const STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (change as you like)

const statsCache = {
  email: null,
  loadedAt: 0,

  // core stats JSON
  core: null,

  // graph object URLs (created from blobs)
  urls: {
    incomeVsExpenses: null,
    byCategory: null,
    byMonths: null,
  },
};

function cacheValid(email) {
  if (!statsCache.loadedAt) return false;
  if (!statsCache.email || statsCache.email !== email) return false;
  return Date.now() - statsCache.loadedAt < STATS_CACHE_TTL_MS;
}

function revokeGraphUrls() {
  const u = statsCache.urls;
  if (u.incomeVsExpenses) URL.revokeObjectURL(u.incomeVsExpenses);
  if (u.byCategory) URL.revokeObjectURL(u.byCategory);
  if (u.byMonths) URL.revokeObjectURL(u.byMonths);

  statsCache.urls.incomeVsExpenses = null;
  statsCache.urls.byCategory = null;
  statsCache.urls.byMonths = null;
}

/* ───────────────────────────────────────────────────────── */

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

/* ── TEXT CARDS ─────────────────────────────────────────── */
function renderStats(payload) {
  const snap = document.getElementById("stats-snapshot");
  const proj = document.getElementById("stats-projection");
  const cats = document.getElementById("stats-categories");
  const trend = document.getElementById("stats-trend");

  const month = payload.month || {};
  const projection = payload.projection || {};
  const categories = payload.categories || [];
  const series = payload.trend || [];

  snap.innerHTML = `
    <h3>THIS_MONTH</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 14px">
      <div><b>Balance</b><div>$${money(payload.balance)}</div></div>
      <div><b>Expenses</b><div>$${money(month.expenses)}</div></div>
      <div><b>Net</b><div>$${money(month.net)}</div></div>
      <div><b>Vs last month</b><div>${money((month.vs_last_month_percent || 0) * 100)}%</div></div>
    </div>
    <div class="stats-muted" style="margin-top:10px">Cached for ${Math.round(STATS_CACHE_TTL_MS / 60000)} min</div>
  `;

  proj.innerHTML = `
    <h3>PROJECTION</h3>
    <div>Daily avg: <b>$${money(projection.daily_avg)}</b></div>
    <div style="margin-top:6px">Projected month total: <b>$${money(projection.projected_month_total)}</b></div>
  `;

  cats.innerHTML = `
    <h3>TOP_CATEGORIES</h3>
    <div style="display:grid;gap:6px">
      ${
        categories.length
          ? categories
              .slice(0, 8)
              .map(
                (c) => `
        <div style="display:flex;justify-content:space-between;gap:10px">
          <span>${c.category_name}</span>
          <span><b>$${money(c.total)}</b> <span class="stats-muted">(${money((c.percent || 0) * 100)}%)</span></span>
        </div>`
              )
              .join("")
          : '<div class="stats-muted">No category data yet.</div>'
      }
    </div>
  `;

  trend.innerHTML = `
    <h3>DAILY_TREND</h3>
    <div style="display:grid;gap:6px">
      ${
        series.length
          ? series
              .slice(-10)
              .map(
                (d) => `
        <div style="display:flex;justify-content:space-between;gap:10px">
          <span>${d.date}</span><span><b>$${money(d.total)}</b></span>
        </div>`
              )
              .join("")
          : '<div class="stats-muted">No trend data yet.</div>'
      }
    </div>
    <div class="stats-muted" style="margin-top:10px">Showing last 10 days.</div>
  `;
}

/* ── GRAPHS RENDER ───────────────────────────────────────── */
function setGraphStatus(statusId, msg) {
  const el = document.getElementById(statusId);
  if (el) el.textContent = msg || "";
}

function setGraphImg(imgId, url) {
  const img = document.getElementById(imgId);
  if (!img) return;
  if (url) img.src = url;
  else img.removeAttribute("src");
}

function showGraphsFromCache() {
  setGraphStatus("income-expenses-graph-status", "");
  setGraphStatus("category-graph-status", "");
  setGraphStatus("months-graph-status", "");

  setGraphImg("income-expenses-img", statsCache.urls.incomeVsExpenses);
  setGraphImg("category-img", statsCache.urls.byCategory);
  setGraphImg("months-img", statsCache.urls.byMonths);
}

/* ── LOADERS (NETWORK ONLY WHEN NEEDED) ──────────────────── */
function setStatisticsLoadingUI() {
  const snap = document.getElementById("stats-snapshot");
  snap.innerHTML = '<h3>LOADING</h3><div class="stats-muted">Fetching statistics...</div>';
  document.getElementById("stats-projection").innerHTML = "<h3>...</h3>";
  document.getElementById("stats-categories").innerHTML = "<h3>...</h3>";
  document.getElementById("stats-trend").innerHTML = "<h3>...</h3>";

  setGraphStatus("income-expenses-graph-status", "Loading...");
  setGraphStatus("category-graph-status", "Loading...");
  setGraphStatus("months-graph-status", "Loading...");
  setGraphImg("income-expenses-img", null);
  setGraphImg("category-img", null);
  setGraphImg("months-img", null);
}

async function fetchAndCacheAll(email) {
  // Fetch core stats + all 3 graphs in parallel
  const [coreRes, g1, g2, g3] = await Promise.all([
    apiFetchStatistics(email),
    apiFetchIncomeVsExpensesGraph(email, 12),
    apiFetchExpensesByCategoryGraph(email),
    apiFetchExpensesByMonthsGraph(email),
  ]);

  // Core stats must be ok
  if (!coreRes.response.ok) {
    throw new Error(coreRes.data?.detail || "FAILED TO LOAD");
  }

  // Revoke previous cached URLs before storing new ones
  revokeGraphUrls();

  // Store core
  statsCache.email = email;
  statsCache.core = coreRes.data;

  // Store graphs (even if one fails, we keep going)
  if (g1.response.ok) statsCache.urls.incomeVsExpenses = URL.createObjectURL(g1.blob);
  if (g2.response.ok) statsCache.urls.byCategory = URL.createObjectURL(g2.blob);
  if (g3.response.ok) statsCache.urls.byMonths = URL.createObjectURL(g3.blob);

  statsCache.loadedAt = Date.now();

  // Return status info for UI messages
  return {
    g1ok: g1.response.ok,
    g2ok: g2.response.ok,
    g3ok: g3.response.ok,
  };
}

function applyCoreAndNavbar(payload) {
  renderStats(payload);

  setNavbarSalary(payload?.salary);

  // persist salary into localStorage.user.salary
  if (payload?.salary !== undefined && payload?.salary !== null && payload?.salary !== "") {
    try {
      const prev = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...prev, salary: payload.salary }));
    } catch {}
  }
}

/* ── MAIN ENTRY ─────────────────────────────────────────── */
async function loadStatistics({ force = false } = {}) {
  const user = getUser() || {};
  const email = user?.email;

  const snap = document.getElementById("stats-snapshot");
  if (!email) {
    snap.textContent = "> ERR: NO USER EMAIL";
    return;
  }

  // If valid cache and not forcing, render immediately without requests
  if (!force && cacheValid(email) && statsCache.core) {
    applyCoreAndNavbar(statsCache.core);
    showGraphsFromCache();
    return;
  }

  // Otherwise network fetch once, then cache
  setStatisticsLoadingUI();

  try {
    const graphStatus = await fetchAndCacheAll(email);

    // render
    applyCoreAndNavbar(statsCache.core);
    showGraphsFromCache();

    // if any graph failed, show error message for that card
    if (!graphStatus.g1ok) setGraphStatus("income-expenses-graph-status", "> ERR: FAILED_TO_LOAD");
    if (!graphStatus.g2ok) setGraphStatus("category-graph-status", "> ERR: FAILED_TO_LOAD");
    if (!graphStatus.g3ok) setGraphStatus("months-graph-status", "> ERR: FAILED_TO_LOAD");
  } catch (e) {
    snap.textContent = `> ERR: ${String(e?.message || "CONNECTION FAILED")}`.toUpperCase();
    setGraphStatus("income-expenses-graph-status", "> ERR");
    setGraphStatus("category-graph-status", "> ERR");
    setGraphStatus("months-graph-status", "> ERR");
  }
}

/* ── INIT ───────────────────────────────────────────────── */
export function initStatistics() {
  document.addEventListener("click", (e) => {
    const sideBtn = e.target.closest(".sidebar-btn");
    if (sideBtn?.dataset.view === "statistics-view") {
      switchView("statistics-view");
      // cached render (no request) unless expired
      loadStatistics({ force: false });
    }

    // OPTIONAL: add a refresh button with id="refresh-statistics"
    const refreshBtn = e.target.closest("#refresh-statistics");
    if (refreshBtn) {
      loadStatistics({ force: true });
    }
  });

  // Avoid leaking object URLs
  window.addEventListener("beforeunload", () => {
    revokeGraphUrls();
  });
}