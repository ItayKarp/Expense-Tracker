import { apiFetchStatistics } from "./api.js";
import { switchView } from "./ui.js";

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

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
    <h3 style="margin-top:0">This month</h3>
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div><b>Balance</b><div>$${money(payload.balance)}</div></div>
      <div><b>Expenses</b><div>$${money(month.expenses)}</div></div>
      <div><b>Net</b><div>$${money(month.net)}</div></div>
      <div><b>Vs last month</b><div>${money((month.vs_last_month_percent || 0) * 100)}%</div></div>
    </div>
  `;

  proj.innerHTML = `
    <h3>Projection</h3>
    <div>Daily avg: <b>$${money(projection.daily_avg)}</b></div>
    <div>Projected month total: <b>$${money(projection.projected_month_total)}</b></div>
  `;

  cats.innerHTML = `
    <h3>Top categories</h3>
    <div>
      ${categories.length ? categories.map(c =>
        `<div style="display:flex;justify-content:space-between;max-width:520px">
          <span>${c.category_name}</span>
          <span>$${money(c.total)} (${money((c.percent || 0) * 100)}%)</span>
        </div>`
      ).join("") : "<div>No category data yet.</div>"}
    </div>
  `;

  trend.innerHTML = `
    <h3>Trend (MTD daily totals)</h3>
    <div style="font-size:11px;color:#666;max-width:720px">
      ${series.length ? series.slice(-14).map(d =>
        `<div style="display:flex;justify-content:space-between">
          <span>${d.date}</span><span>$${money(d.total)}</span>
        </div>`
      ).join("") : "<div>No trend data yet.</div>"}
      <div style="margin-top:8px;color:#888">Showing last 14 days.</div>
    </div>
  `;
}

async function loadStatistics() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const email = user?.email;

  const snap = document.getElementById("stats-snapshot");
  if (!email) {
    snap.innerHTML = "> ERR: NO USER EMAIL";
    return;
  }

  snap.textContent = "> LOADING STATISTICS...";

  try {
    const { response, data } = await apiFetchStatistics(email);
    if (!response.ok) {
      snap.textContent = `> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase();
      return;
    }
    renderStats(data);
  } catch {
    snap.textContent = "> ERR: CONNECTION FAILED";
  }
}

export function initStatistics() {
  document.addEventListener("click", (e) => {
    const sideBtn = e.target.closest(".sidebar-btn");
    if (sideBtn?.dataset.view === "statistics-view") {
      switchView("statistics-view");
      loadStatistics();
    }
  });
}