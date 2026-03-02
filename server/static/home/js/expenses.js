// ── EXPENSES.JS ───────────────────────────────────────────
// Owns all expense state and rendering. Exports the state arrays
// and render helpers so modals.js can patch and re-render after
// a delete or update.

import { apiFetchAllExpenses, apiFetchMonthlyExpenses, apiFetchYearlyExpenses, apiFetchCategories } from "./api.js";
import { fmt, loadDashboard, switchView } from "./ui.js";

// ── STATE ──────────────────────────────────────────────────
export let allExpenses     = [];
export let monthlyExpenses = [];
export let yearlyExpenses  = [];
export let allLoaded       = false;
export let monthlyLoaded   = false;
export let yearlyLoaded    = false;

let activeTab = "monthly";
let sortCol   = "date";
let sortDir   = "desc";

// Cache of rendered expense objects — used by the dots-btn onclick
export let _expenseRenderCache = [];

// ── CATEGORY CACHE ─────────────────────────────────────────
let _categoriesCache = null;

// Add 'forceRefresh = false' to the arguments
export async function fetchCategories(email, forceRefresh = false) {
    // 1. Check cache: Only return cached data if we aren't forcing a refresh
    if (_categoriesCache && !forceRefresh) {
        return _categoriesCache;
    }

    try {
        // 2. Try to get fresh categories from the server
        const { response, data } = await apiFetchCategories(email);

        if (response.ok) {
            // Support different API response shapes (data.categories or raw array)
            _categoriesCache = data.categories || data || [];
        } else {
            _categoriesCache = [];
        }
    } catch (err) {
        console.error("Error fetching categories from API:", err);
        _categoriesCache = [];
    }

    // 3. Fallback: If the API returned nothing, extract categories from existing expenses
    if (!_categoriesCache || _categoriesCache.length === 0) {
        const all = [...allExpenses, ...monthlyExpenses, ...yearlyExpenses];
        const seen = new Set();
        const fallbackCache = [];

        all.forEach(exp => {
            // Look for category name in common field variations
            const name = exp.category || exp.name || "";
            if (name && !seen.has(name)) {
                seen.add(name);
                fallbackCache.push({ name: name });
            }
        });

        _categoriesCache = fallbackCache;
    }

    return _categoriesCache;
}

// ── STATE SETTERS (used by modals after delete/update) ─────
export function setAllExpenses(arr)     { allExpenses     = arr; }
export function setMonthlyExpenses(arr) { monthlyExpenses = arr; }
export function setYearlyExpenses(arr)  { yearlyExpenses  = arr; }

// ── LOADERS ────────────────────────────────────────────────
async function loadMonthlyExpenses(email) {
    setStatus("> FETCHING LAST MONTH...", "");
    setLoading(true);

    try {
        const { response, data } = await apiFetchMonthlyExpenses(email);
        if (response.ok) {
            monthlyExpenses = data.expenses || data || [];
            monthlyLoaded   = true;
            setStatus("", "");
            renderExpenses(getFilteredSorted());
        } else {
            setStatus(`> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase(), "err");
            setEmptyRow();
        }
    } catch {
        setStatus("> ERR: CONNECTION FAILED", "err");
        setEmptyRow("Could not reach server.");
    } finally {
        setLoading(false);
    }
}

async function loadYearlyExpenses(email) {
    setStatus("> FETCHING LAST YEAR...", "");
    setLoading(true);

    try {
        const { response, data } = await apiFetchYearlyExpenses(email);
        if (response.ok) {
            yearlyExpenses = data.expenses || data || [];
            yearlyLoaded   = true;
            setStatus("", "");
            renderExpenses(getFilteredSorted());
        } else {
            setStatus(`> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase(), "err");
            setEmptyRow();
        }
    } catch {
        setStatus("> ERR: CONNECTION FAILED", "err");
        setEmptyRow("Could not reach server.");
    } finally {
        setLoading(false);
    }
}

async function loadAllExpenses(email) {
    setStatus("> FETCHING RECORDS...", "");
    setLoading(true);

    try {
        const { response, data } = await apiFetchAllExpenses(email);
        if (response.ok) {
            allExpenses = data.expenses || data || [];
            allLoaded   = true;
            setStatus("", "");
            renderExpenses(getFilteredSorted());
        } else {
            setStatus(`> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase(), "err");
            setEmptyRow();
        }
    } catch {
        setStatus("> ERR: CONNECTION FAILED", "err");
        setEmptyRow("Could not reach server.");
    } finally {
        setLoading(false);
    }
}

export function loadActiveTab(email) {
    if (activeTab === "monthly") {
        monthlyLoaded ? renderExpenses(getFilteredSorted()) : loadMonthlyExpenses(email);
    } else if (activeTab === "yearly") {
        yearlyLoaded  ? renderExpenses(getFilteredSorted()) : loadYearlyExpenses(email);
    } else {
        allLoaded     ? renderExpenses(getFilteredSorted()) : loadAllExpenses(email);
    }
}

// ── RENDER ─────────────────────────────────────────────────
export function renderExpenses(expenses) {
    _expenseRenderCache = [];
    const tbody   = document.getElementById("expenses-tbody");
    const countEl = document.getElementById("expenses-count");
    const totalEl = document.getElementById("expenses-total");

    if (!expenses.length) {
        tbody.innerHTML     = `<tr class="table-empty-row"><td colspan="6">No expenses found.</td></tr>`;
        countEl.textContent = "";
        totalEl.textContent = "";
        return;
    }

    let total = 0;
    tbody.innerHTML = expenses.map(exp => {
        const amount    = parseFloat(exp.amount) || 0;
        const display   = "-$" + fmt(Math.abs(amount));
        total += Math.abs(amount);

        const status   = (exp.status || "").toLowerCase();
        const badgeCls = ["completed", "pending", "failed"].includes(status) ? status : "";
        const badgeLbl = status || "—";

        const rawDate = exp.created_at || exp.date;
        const date    = rawDate
            ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—";

        const expIdx = _expenseRenderCache.push(exp) - 1;

        return `<tr>
            <td>${date}</td>
            <td>${exp.description || "—"}</td>
            <td>${exp.name || exp.category || "—"}</td>
            <td><span class="expense-amount negative">${display}</span></td>
            <td><span class="expense-badge ${badgeCls}">${badgeLbl}</span></td>
            <td class="actions-cell">
                <button class="dots-btn" title="Options" onclick="toggleExpenseMenu(this, ${expIdx})">⋯</button>
            </td>
        </tr>`;
    }).join("");

    const currentBalance = window._currentBalance || 0;
    const balanceBefore  = currentBalance + total;

    countEl.textContent = `${expenses.length} record${expenses.length !== 1 ? "s" : ""}`;
    totalEl.innerHTML   =
        `<span class="summary-item">Balance before expenses: <strong class="amount-neutral">$${fmt(balanceBefore)}</strong></span>` +
        `<span class="summary-sep">→</span>` +
        `<span class="summary-item">Total spent: <strong class="amount-negative">-$${fmt(total)}</strong></span>` +
        `<span class="summary-sep">→</span>` +
        `<span class="summary-item">Current balance: <strong class="amount-neutral">$${fmt(currentBalance)}</strong></span>`;
}

// ── FILTER & SORT ──────────────────────────────────────────
function getActiveExpenses() {
    if (activeTab === "monthly") return monthlyExpenses;
    if (activeTab === "yearly")  return yearlyExpenses;
    return allExpenses;
}

export function getFilteredSorted() {
    const q = (document.getElementById("expense-search")?.value || "").toLowerCase().trim();
    const base = q
        ? getActiveExpenses().filter(exp =>
            (exp.description || "").toLowerCase().includes(q) ||
            (exp.name || exp.category || "").toLowerCase().includes(q) ||
            (exp.status || "").toLowerCase().includes(q)
          )
        : getActiveExpenses();
    return sortExpenses(base);
}

function sortExpenses(expenses) {
    return [...expenses].sort((a, b) => {
        let valA, valB;

        if (sortCol === "date") {
            valA = new Date(a.created_at || a.date || 0).getTime();
            valB = new Date(b.created_at || b.date || 0).getTime();
        } else if (sortCol === "amount") {
            valA = parseFloat(a.amount) || 0;
            valB = parseFloat(b.amount) || 0;
        } else if (sortCol === "description") {
            valA = (a.description || "").toLowerCase();
            valB = (b.description || "").toLowerCase();
        } else if (sortCol === "category") {
            valA = (a.name || a.category || "").toLowerCase();
            valB = (b.name || b.category || "").toLowerCase();
        }

        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ?  1 : -1;
        return 0;
    });
}

function updateSortHeaders() {
    document.querySelectorAll("#expenses-table th.sortable").forEach(th => {
        const col    = th.dataset.col;
        const iconEl = th.querySelector(".sort-icon");
        th.classList.remove("sort-asc", "sort-desc");
        if (iconEl) iconEl.textContent = "↕";

        if (col === sortCol) {
            th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
            if (iconEl) iconEl.textContent = sortDir === "asc" ? "↑" : "↓";
        }
    });
}

// ── DOM HELPERS ────────────────────────────────────────────
function setStatus(text, modifier) {
    const el = document.getElementById("expenses-status");
    el.textContent = text;
    el.className   = modifier ? `expenses-status ${modifier}` : "expenses-status";

    if (text) {
        document.getElementById("expenses-tbody").innerHTML =
            `<tr class="table-empty-row"><td colspan="6">Loading...</td></tr>`;
    }
}

function setEmptyRow(msg = "No data available.") {
    document.getElementById("expenses-tbody").innerHTML =
        `<tr class="table-empty-row"><td colspan="6">${msg}</td></tr>`;
}

function setLoading(isLoading) {
    const btn = document.getElementById("refresh-expenses-btn");
    if (!btn) return;
    btn.disabled = isLoading;
    btn.classList.toggle("loading", isLoading);
}

function getEmail() {
    return JSON.parse(localStorage.getItem("user"))?.email;
}

// ── INIT ────────────────────────────────────────────────────
export function initExpenses() {
    // Sidebar → expenses view
    document.addEventListener("click", (e) => {
        const sideBtn = e.target.closest(".sidebar-btn");
        if (sideBtn?.dataset.view === "expenses-view") {
            switchView("expenses-view");
            loadActiveTab(getEmail());
        }

        // Tab buttons
        const tabBtn = e.target.closest(".tab-btn");
        if (tabBtn) {
            const tab = tabBtn.dataset.tab;
            if (tab === activeTab) return;
            activeTab = tab;
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === tabBtn));
            loadActiveTab(getEmail());
        }

        // Refresh button
        if (e.target.closest("#refresh-expenses-btn")) {
            if (activeTab === "monthly") { monthlyExpenses = []; monthlyLoaded = false; }
            else if (activeTab === "yearly") { yearlyExpenses = []; yearlyLoaded = false; }
            else { allExpenses = []; allLoaded = false; }
            loadActiveTab(getEmail());
        }

        // Column sort headers
        const th = e.target.closest("#expenses-table th.sortable");
        if (th) {
            const col = th.dataset.col;
            sortDir   = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : "asc";
            sortCol   = col;
            updateSortHeaders();
            renderExpenses(getFilteredSorted());
        }
    });

    // Live search
    document.addEventListener("input", (e) => {
        if (e.target.id === "expense-search") renderExpenses(getFilteredSorted());
    });
}

// Add this to your expenses script
export async function refreshCurrentTab() {
    const email = getEmail();

    // Clear the cache for the active tab to force a re-fetch
    if (activeTab === "monthly") { monthlyExpenses = []; monthlyLoaded = false; }
    else if (activeTab === "yearly") { yearlyExpenses = []; yearlyLoaded = false; }
    else { allExpenses = []; allLoaded = false; }

    // This is the function that actually hits the API and calls renderExpenses
    await loadActiveTab(email);
}