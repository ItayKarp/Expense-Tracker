// ── NUMBER FORMATTER ─────────────────────────────────────
function fmt(n) {
    return parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── FORM TOGGLE ──────────────────────────────────────────
document.getElementById("to-signup").addEventListener("click", function () {
    document.getElementById("login-form").classList.remove("active");
    document.getElementById("signup-form").classList.add("active");
    document.getElementById("form-title").innerHTML = 'SIGN_UP<span class="cursor">█</span>';
    document.getElementById("signup-status").textContent = "";
});

document.getElementById("to-login").addEventListener("click", function () {
    document.getElementById("signup-form").classList.remove("active");
    document.getElementById("login-form").classList.add("active");
    document.getElementById("form-title").innerHTML = 'SIGN_IN<span class="cursor">█</span>';
    document.getElementById("login-status").textContent = "";
});

// ── DASHBOARD LOADER ──────────────────────────────────────
// Fetches account data from your endpoint and populates the dashboard section.
// Handle GET /dashboard/data on your backend — it should return:
// { account_name: string, balance: number, monthly_expenses: number }
async function loadDashboard(email) {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`/dashboard/data?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }  // ← add this
    });

    const data = await response.json();

    if (response.ok) {
        document.getElementById("username").textContent      = data.account_name;
        document.getElementById("balance-display").textContent  = `$${fmt(data.balance)}`;
        document.getElementById("expenses-display").textContent = `$${fmt(data.monthly_expenses)}`;
        window._currentBalance = parseFloat(data.balance) || 0;
    } else {
        console.error("Failed to load dashboard data:", data.detail);
    }
}

// ── SHOW DASHBOARD (in-page) ──────────────────────────────
function showDashboard(email) {
    const overlay = document.querySelector(".screen-overlay");
    overlay.style.transition = "opacity 0.5s ease";
    overlay.style.opacity = "0";

    setTimeout(() => {
        overlay.style.display = "none";  // now safe — app-container is no longer its child

        const app = document.getElementById("app-container");
        app.style.display = "flex";      // works correctly now
        app.classList.add("app-visible");

        loadDashboard(email);
    }, 500);
}

// ── SIGN UP ───────────────────────────────────────────────
document.getElementById("submit-signup").addEventListener("click", async function (e) {
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
        const response = await fetch("/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

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
                document.getElementById("new-email").value = email;

                const postSignup = document.getElementById("post-signup");
                postSignup.style.display = "block";
                postSignup.classList.add("ps-visible");
            }, 600);
        } else {
            statusEl.textContent = `> ERR: ${data.detail || "SIGNUP FAILED"}`.toUpperCase();
            statusEl.className   = "status-line";
        }
    } catch (error) {
        statusEl.textContent = "> ERR: CONNECTION FAILED";
        statusEl.className   = "status-line";
    } finally {
        btn.disabled = false;
    }
});

// ── NEW DETAILS (post-signup) ─────────────────────────────
document.getElementById("submit-new-details").addEventListener("click", async function (e) {
    e.preventDefault();

    const balance  = document.getElementById("balance").value;
    const fullName = document.getElementById("Full-name").value;
    const newEmail = document.getElementById("new-email").value;
    const btn      = document.getElementById("submit-new-details");

    let statusEl = document.getElementById("new-details-status");
    if (!statusEl) {
        statusEl = document.createElement("div");
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
        const token    = localStorage.getItem("access_token");
        const response = await fetch("/auth/setup", {
            method:  "POST",
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ balance: parseFloat(balance), full_name: fullName, email: newEmail }),
        });

        const data = await response.json();

        if (response.ok) {
            statusEl.textContent = "> PROFILE SAVED. ENTERING SYSTEM...";
            statusEl.className   = "status-line ok";
            setTimeout(() => showDashboard(newEmail), 800);  // ← in-page, no redirect
        } else {
            statusEl.textContent = `> ERR: ${data.detail || "SAVE FAILED"}`.toUpperCase();
            statusEl.className   = "status-line";
        }
    } catch (error) {
        statusEl.textContent = "> ERR: CONNECTION FAILED";
        statusEl.className   = "status-line";
    } finally {
        btn.disabled = false;
    }
});

// ── SIGN IN ───────────────────────────────────────────────
document.getElementById("submit-login").addEventListener("click", async function (e) {
    e.preventDefault();

    const email    = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const statusEl = document.getElementById("login-status");
    const btn      = document.getElementById("submit-login");

    if (!email || !password) {
        statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
        statusEl.className   = "status-line";
        return;
    }

    btn.disabled         = true;
    statusEl.textContent = "> AUTHENTICATING...";
    statusEl.className   = "status-line ok";

    try {
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("access_token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            statusEl.textContent = "> ACCESS GRANTED. LOADING...";
            statusEl.className   = "status-line ok";
            setTimeout(() => showDashboard(email), 800);  // ← in-page, no redirect
        } else {
            statusEl.textContent = `> ERR: ${data.detail || "AUTH FAILED"}`.toUpperCase();
            statusEl.className   = "status-line";
        }
    } catch (error) {
        statusEl.textContent = "> ERR: CONNECTION FAILED";
        statusEl.className   = "status-line";
    } finally {
        btn.disabled = false;
    }
});
// ── AUTO LOGIN ON REFRESH ───────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("access_token");
    const user  = JSON.parse(localStorage.getItem("user"));

    if (token && user && user.email) {
        showDashboard(user.email);
    }
});
// ── SIDEBAR NAVIGATION ────────────────────────────────────
function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));

    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");

    const btn = document.querySelector(`.sidebar-btn[data-view="${viewId}"]`);
    if (btn) btn.classList.add("active");
}

document.addEventListener("click", function (e) {
    const btn = e.target.closest(".sidebar-btn");
    if (btn && btn.dataset.view) {
        const viewId = btn.dataset.view;
        switchView(viewId);

        // Pull email from localStorage — it's saved during login/signup
        const user = JSON.parse(localStorage.getItem("user"));
        const email = user?.email;

        if (viewId === "expenses-view") loadExpenses(email);   // ← pass email
        if (viewId === "statistics-view") loadStatistics();
    }

    if (e.target.id === "profile-btn") switchView("profile-view");

    if (e.target.id === "logout-btn") {
        localStorage.clear();
        location.reload();
    }
});

// ── EXPENSES ──────────────────────────────────────────────
// Handle GET /expenses on your backend.
// It should return an array of expense objects:
// [{ created_at, description, name, amount }, ...]
// Filtered server-side by the authenticated user's token/id.
let allExpenses  = [];
let sortCol      = "date";   // default sort column
let sortDir      = "desc";   // default sort direction

async function loadExpenses(email) {
    const statusEl = document.getElementById("expenses-status");
    const tbody    = document.getElementById("expenses-tbody");

    statusEl.textContent = "> FETCHING RECORDS...";
    statusEl.className   = "expenses-status";
    tbody.innerHTML      = `<tr class="table-empty-row"><td colspan="5">Loading...</td></tr>`;

    try {
        const response = await fetch(`/dashboard/expenses?email=${encodeURIComponent(email)}`, {
            method: "GET"
        });

        const data = await response.json();

        if (response.ok) {
            allExpenses = data.expenses || data || [];
            statusEl.textContent = "";
            renderExpenses(getFilteredSorted());
        } else {
            statusEl.textContent = `> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase();
            statusEl.className   = "expenses-status err";
            tbody.innerHTML      = `<tr class="table-empty-row"><td colspan="5">No data available.</td></tr>`;
        }
    } catch (err) {
        statusEl.textContent = "> ERR: CONNECTION FAILED";
        statusEl.className   = "expenses-status err";
        tbody.innerHTML      = `<tr class="table-empty-row"><td colspan="5">Could not reach server.</td></tr>`;
    }
}

// ── SORT LOGIC ────────────────────────────────────────────
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

function getFilteredSorted() {
    const q = (document.getElementById("expense-search")?.value || "").toLowerCase().trim();
    const base = q
        ? allExpenses.filter(exp =>
            (exp.description || "").toLowerCase().includes(q) ||
            (exp.name || exp.category || "").toLowerCase().includes(q) ||
            (exp.status || "").toLowerCase().includes(q)
          )
        : allExpenses;
    return sortExpenses(base);
}

function updateSortHeaders() {
    document.querySelectorAll("#expenses-table th.sortable").forEach(th => {
        const col     = th.dataset.col;
        const iconEl  = th.querySelector(".sort-icon");
        th.classList.remove("sort-asc", "sort-desc");
        if (iconEl) iconEl.textContent = "↕";

        if (col === sortCol) {
            th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
            if (iconEl) iconEl.textContent = sortDir === "asc" ? "↑" : "↓";
        }
    });
}

// Header click → sort
document.addEventListener("click", function (e) {
    const th = e.target.closest("#expenses-table th.sortable");
    if (!th) return;

    const col = th.dataset.col;
    if (sortCol === col) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
        sortCol = col;
        sortDir = "asc";
    }

    updateSortHeaders();
    renderExpenses(getFilteredSorted());
});

function renderExpenses(expenses) {
    const tbody   = document.getElementById("expenses-tbody");
    const countEl = document.getElementById("expenses-count");
    const totalEl = document.getElementById("expenses-total");

    if (!expenses.length) {
        tbody.innerHTML     = `<tr class="table-empty-row"><td colspan="5">No expenses found.</td></tr>`;
        countEl.textContent = "";
        totalEl.textContent = "";
        return;
    }

    let total = 0;
    tbody.innerHTML = expenses.map(exp => {
        const amount  = parseFloat(exp.amount) || 0;
        const display = "-$" + fmt(Math.abs(amount));
        total += Math.abs(amount);

        const status   = (exp.status || "").toLowerCase();
        const badgeCls = ["completed","pending","failed"].includes(status) ? status : "";
        const badgeLbl = status || "—";

        const rawDate = exp.created_at || exp.date;
        const date    = rawDate
            ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "—";

        return `<tr>
            <td>${date}</td>
            <td>${exp.description || "—"}</td>
            <td>${exp.name || exp.category || "—"}</td>
            <td><span class="expense-amount negative">${display}</span></td>
            <td><span class="expense-badge ${badgeCls}">${badgeLbl}</span></td>
        </tr>`;
    }).join("");

    const currentBalance = window._currentBalance || 0;
    const balanceBefore  = currentBalance + total;

    countEl.textContent = `${expenses.length} record${expenses.length !== 1 ? "s" : ""}`;
    totalEl.innerHTML =
        `<span class="summary-item">Balance before expenses: <strong class="amount-neutral">$${fmt(balanceBefore)}</strong></span>` +
        `<span class="summary-sep">→</span>` +
        `<span class="summary-item">Total spent: <strong class="amount-negative">-$${fmt(total)}</strong></span>` +
        `<span class="summary-sep">→</span>` +
        `<span class="summary-item">Current balance: <strong class="amount-neutral">$${fmt(currentBalance)}</strong></span>`;
}

// Live search filter
document.addEventListener("input", function (e) {
    if (e.target.id !== "expense-search") return;
    renderExpenses(getFilteredSorted());
});

// ── STATISTICS ────────────────────────────────────────────
// Handle GET /statistics on your backend.
// Return whatever shape you prefer — this just renders the raw response for now.
async function loadStatistics() {
    const token      = localStorage.getItem("access_token");
    const contentEl  = document.getElementById("statistics-content");

    contentEl.textContent = "> LOADING STATISTICS...";

    try {
        const response = await fetch("/statistics", {
            method:  "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            // Replace the block below with your own rendering logic once
            // you know the shape of the /statistics response.
            contentEl.innerHTML = `<pre style="font-size:11px;color:#555;letter-spacing:0.03em;line-height:1.7">${JSON.stringify(data, null, 2)}</pre>`;
        } else {
            contentEl.textContent = `> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase();
        }
    } catch (err) {
        contentEl.textContent = "> ERR: CONNECTION FAILED";
    }
}