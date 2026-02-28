// ── MODALS.JS ─────────────────────────────────────────────
// Owns: the ⋯ row dropdown, confirm modal, update modal,
//       delete handler, and update submit handler.
// Exposes toggle/close/submit functions on window because
// they are called via inline onclick attributes in rendered rows.

import { apiDeleteExpense, apiUpdateExpense, apiCreateCategory, apiCreateExpense } from "./api.js";
import { loadDashboard }                      from "./ui.js";
import {
    _expenseRenderCache,
    fetchCategories,
    getFilteredSorted,
    renderExpenses,
    setAllExpenses,
    setMonthlyExpenses,
    setYearlyExpenses,
    allExpenses,
    monthlyExpenses,
    yearlyExpenses, refreshCurrentTab
} from "./expenses.js";

// ── HELPERS ────────────────────────────────────────────────
function getExpenseId(exp) {
    const raw = exp.id ?? exp.expense_id ?? exp.expenseId ?? exp._id ?? exp.Expense_id ?? null;
    return raw !== null ? parseInt(raw, 10) : null;
}

function getEmail() {
    return JSON.parse(localStorage.getItem("user"))?.email;
}

// The expense object currently being acted on
let _pendingExpense = null;

// ── DROPDOWN ───────────────────────────────────────────────
function injectDropdown() {
    const dd = document.createElement("div");
    dd.id        = "expense-dropdown";
    dd.className = "expense-dropdown";
    dd.innerHTML = `
        <button class="dropdown-item"       onclick="toggleExpenseMenu._action('update')">✎ Update</button>
        <button class="dropdown-item danger" onclick="toggleExpenseMenu._action('delete')">✕ Delete</button>
    `;
    document.body.appendChild(dd);

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
        if (!dd.contains(e.target) && !e.target.closest(".dots-btn")) {
            dd.classList.remove("visible");
        }
    });
}

// Called via inline onclick in renderExpenses — must be on window
window.toggleExpenseMenu = function (btn, expIdx) {
    const expObj = _expenseRenderCache[expIdx];
    const dd     = document.getElementById("expense-dropdown");

    if (dd.classList.contains("visible") && _pendingExpense === expObj) {
        dd.classList.remove("visible");
        _pendingExpense = null;
        return;
    }

    _pendingExpense = expObj;

    const rect    = btn.getBoundingClientRect();
    dd.style.top  = (rect.bottom + window.scrollY + 4) + "px";
    dd.style.left = (rect.left   + window.scrollX) + "px";
    dd.classList.add("visible");

    requestAnimationFrame(() => {
        const ddRect = dd.getBoundingClientRect();
        if (ddRect.right > window.innerWidth - 8) {
            dd.style.left = (rect.right + window.scrollX - dd.offsetWidth) + "px";
        }
    });
};

// Shared action dispatcher — attached as property so the onclick can reach it cleanly
toggleExpenseMenu._action = function (action) {
    document.getElementById("expense-dropdown").classList.remove("visible");
    if (!_pendingExpense) { alert("Could not identify the expense."); return; }
    if (action === "delete") handleDelete(_pendingExpense);
    else                     openUpdateModal(_pendingExpense);
};

// ── CONFIRM MODAL ──────────────────────────────────────────
function showConfirmModal(message, onConfirm) {
    document.getElementById("confirm-modal-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id    = "confirm-modal-overlay";
    overlay.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-modal-title">⚠ CONFIRM_ACTION</div>
            <div class="confirm-modal-msg">${message}</div>
            <div class="confirm-modal-btns">
                <button id="confirm-yes" class="confirm-btn confirm-btn-yes">[ YES — DELETE ]</button>
                <button id="confirm-no"  class="confirm-btn confirm-btn-no">[ CANCEL ]</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("visible"));

    const close = () => {
        overlay.classList.remove("visible");
        setTimeout(() => overlay.remove(), 200);
    };

    let mousedownTarget = null;
    overlay.addEventListener("mousedown", (e) => { mousedownTarget = e.target; });
    overlay.addEventListener("click", (e)      => { if (e.target === overlay && mousedownTarget === overlay) close(); });

    document.getElementById("confirm-yes").addEventListener("click", () => { close(); onConfirm(); });
    document.getElementById("confirm-no").addEventListener("click",  close);
}

// ── DELETE ─────────────────────────────────────────────────
function handleDelete(exp) {
    showConfirmModal("Delete this expense?<br>This action cannot be undone.", async () => {
        const expenseId = getExpenseId(exp);
        const email     = getEmail();

        if (!email) { alert("Error: Could not identify account. Please log in again."); return; }
        if (!expenseId || isNaN(expenseId)) { alert("Error: Could not resolve a valid expense ID."); return; }

        try {
            const { response, data } = await apiDeleteExpense(email, expenseId);

            if (response.ok && data.Status === "Success") {
                const removeIt = arr => arr.filter(e => getExpenseId(e) !== expenseId);
                setAllExpenses(removeIt(allExpenses));
                setMonthlyExpenses(removeIt(monthlyExpenses));
                setYearlyExpenses(removeIt(yearlyExpenses));
                renderExpenses(getFilteredSorted());
                loadDashboard(email);
                refreshCurrentTab();
            } else {
                alert("Delete failed: " + formatError(data.detail || data.Status || data.message));
            }
        } catch {
            alert("Connection error. Could not delete expense.");
        }
    });
}

// ── UPDATE MODAL ───────────────────────────────────────────
function injectUpdateModal() {
    const modal = document.createElement("div");
    modal.id        = "update-modal-overlay";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <span>UPDATE EXPENSE</span>
                <button class="modal-close" onclick="closeUpdateModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="modal-field">
                    <label>Amount</label>
                    <input type="number" id="modal-amount" placeholder="0.00" step="0.01">
                </div>
                <div class="modal-field">
                    <label>Category</label>
                    <select id="modal-category"></select>
                </div>
                <div class="modal-field">
                    <label>Description</label>
                    <input type="text" id="modal-description" placeholder="Description">
                </div>
                <div id="modal-status" class="modal-status"></div>
                <button id="modal-submit" class="btn-submit modal-submit-btn" onclick="submitUpdate()">[ SAVE CHANGES ]</button>
            </div>
        </div>
    `;

    let mousedownTarget = null;
    modal.addEventListener("mousedown", (e) => { mousedownTarget = e.target; });
    modal.addEventListener("click",     (e) => { if (e.target === modal && mousedownTarget === modal) closeUpdateModal(); });

    document.body.appendChild(modal);
}

async function openUpdateModal(exp) {
    document.getElementById("modal-amount").value       = Math.abs(parseFloat(exp.amount) || 0);
    document.getElementById("modal-description").value  = exp.description || "";
    document.getElementById("modal-status").textContent = "";
    document.getElementById("modal-status").className   = "modal-status";

    const catEl      = document.getElementById("modal-category");
    const currentCat = exp.name || exp.category || "";
    const email      = getEmail();
    catEl.innerHTML  = `<option value="">Loading categories...</option>`;


    const categories = await fetchCategories(email);
    catEl.innerHTML  = categories.length
        ? categories.map(c => {
            const n = c.name || c.category_name || String(c);
            return `<option value="${n}" ${n === currentCat ? "selected" : ""}>${n}</option>`;
          }).join("")
        : `<option value="">No categories available</option>`;

    document.getElementById("update-modal-overlay").classList.add("visible");
}

window.closeUpdateModal = function () {
    document.getElementById("update-modal-overlay").classList.remove("visible");
};

window.submitUpdate = async function () {
    if (!_pendingExpense) { alert("Could not identify the expense."); return; }

    const expenseId = getExpenseId(_pendingExpense);
    const email     = getEmail();
    const amount    = parseFloat(document.getElementById("modal-amount").value);
    const catName   = document.getElementById("modal-category").value;
    const desc      = document.getElementById("modal-description").value.trim();
    const statusEl  = document.getElementById("modal-status");
    const btn       = document.getElementById("modal-submit");

    if (!amount || !catName || !desc) {
        statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
        statusEl.className   = "modal-status err";
        return;
    }

    if (!email) {
        statusEl.textContent = "> ERR: NOT LOGGED IN. REFRESH PAGE.";
        statusEl.className   = "modal-status err";
        return;
    }

    btn.disabled         = true;
    statusEl.textContent = "> SAVING...";
    statusEl.className   = "modal-status ok";

    try {
        const { response, data } = await apiUpdateExpense(email, expenseId, amount, catName, desc);

        if (response.ok && data.Status === "Success") {
            statusEl.textContent = "> SAVED.";

            const patch = arr => arr.map(e =>
                getExpenseId(e) === expenseId
                    ? { ...e, amount, description: desc, name: catName, category: catName }
                    : e
            );
            setAllExpenses(patch(allExpenses));
            setMonthlyExpenses(patch(monthlyExpenses));
            setYearlyExpenses(patch(yearlyExpenses));

            setTimeout(() => {
                closeUpdateModal();
                renderExpenses(getFilteredSorted());
                loadDashboard(email);
            }, 500);
        } else {
            statusEl.textContent = `> ERR: ${formatError(data.detail || data.Status || data.message)}`.toUpperCase();
            statusEl.className   = "modal-status err";
        }
    } catch {
        statusEl.textContent = "> ERR: CONNECTION FAILED";
        statusEl.className   = "modal-status err";
    } finally {
        btn.disabled = false;
    }
};

// ── ERROR FORMATTER ────────────────────────────────────────
function formatError(raw) {
    if (Array.isArray(raw))       return raw.map(e => e.msg || e.message || JSON.stringify(e)).join(", ");
    if (typeof raw === "object")  return JSON.stringify(raw);
    return String(raw || "Unknown error");
}

// ── INIT ───────────────────────────────────────────────────
export function initModals() {
    injectDropdown();
    injectUpdateModal();
    injectCategoryModal();
    injectCreateExpenseModal();
}

// ── CREATE CATEGORY ──────────────────────────────────────────
function injectCategoryModal() {
    const modal = document.createElement("div");
    modal.id = "category-modal-overlay";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <span>CREATE NEW CATEGORY</span>
                <button class="modal-close" onclick="closeCategoryModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="modal-field">
                    <label>Category Name</label>
                    <input type="text" id="cat-name" placeholder="e.g. Groceries">
                </div>
                <div class="modal-field">
                    <label>Monthly Budget</label>
                    <input type="number" id="cat-budget" placeholder="0.00" step="0.01">
                </div>
                <div id="cat-modal-status" class="modal-status"></div>
                <button id="cat-modal-submit" class="btn-submit modal-submit-btn" onclick="submitCategory()">[ CREATE CATEGORY ]</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.openCategoryModal = function() {
    document.getElementById("cat-name").value = "";
    document.getElementById("cat-budget").value = "";
    document.getElementById("cat-modal-status").textContent = "";
    document.getElementById("category-modal-overlay").classList.add("visible");
};

window.closeCategoryModal = function() {
    document.getElementById("category-modal-overlay").classList.remove("visible");
};

window.submitCategory = async function() {
    const name = document.getElementById("cat-name").value.trim();
    const budget = document.getElementById("cat-budget").value;
    const email = getEmail();
    const statusEl = document.getElementById("cat-modal-status");
    const btn = document.getElementById("cat-modal-submit");

    if (!name || !budget) {
        statusEl.textContent = "> ERR: ALL FIELDS REQUIRED";
        statusEl.className = "modal-status err";
        return;
    }

    btn.disabled = true;
    statusEl.textContent = "> CREATING...";
    statusEl.className = "modal-status ok";

    try {
        const { response, data } = await apiCreateCategory(email, name, budget);

        if (response.ok) {
            statusEl.textContent = "> CATEGORY CREATED.";
            setTimeout(() => {
                closeCategoryModal();
                // Refresh dashboard to show new category in charts/dropdowns
                loadDashboard(email);
            }, 800);
        } else {
            statusEl.textContent = `> ERR: ${formatError(data.detail || data.message)}`;
            statusEl.className = "modal-status err";
        }
    } catch (err) {
        statusEl.textContent = "> ERR: CONNECTION FAILED";
        statusEl.className = "modal-status err";
    } finally {
        btn.disabled = false;
    }
};

// --- CREATE EXPENSE MODAL ---
function injectCreateExpenseModal() {
    const modal = document.createElement("div");
    modal.id = "create-expense-modal-overlay";
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <span>NEW_TRANSACTION_ENTRY</span>
                <button class="modal-close" onclick="closeCreateExpenseModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="modal-field">
                    <label>Amount</label>
                    <input type="number" id="new-exp-amount" placeholder="0.00" step="0.01">
                </div>
                <div class="modal-field">
                    <label>Category</label>
                    <select id="new-exp-category" class="modal-select"></select>
                </div>
                <div class="modal-field">
                    <label>Description</label>
                    <input type="text" id="new-exp-desc" placeholder="What was this for?">
                </div>
                <div id="create-exp-status" class="modal-status"></div>
                <button id="create-exp-submit" class="btn-submit modal-submit-btn" onclick="submitNewExpense()">[ EXECUTE_ADD ]</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.openCreateExpenseModal = async function() {
    document.getElementById("new-exp-amount").value = "";
    document.getElementById("new-exp-desc").value = "";
    document.getElementById("create-exp-status").textContent = "";

    const select = document.getElementById("new-exp-category");
    select.innerHTML = '<option value="" disabled selected>Refreshing...</option>';
    document.getElementById("create-expense-modal-overlay").classList.add("visible");

    try {
        // NOTICE: passing 'true' here clears the old category list
        const categories = await fetchCategories(getEmail(), true);

        select.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement("option");
            const name = cat.name || (typeof cat === 'string' ? cat : "Unknown");
            opt.value = name;
            opt.textContent = name.toUpperCase();
            select.appendChild(opt);
        });
    } catch (err) {
        select.innerHTML = '<option>Error loading categories</option>';
    }
};

window.closeCreateExpenseModal = function() {
    document.getElementById("create-expense-modal-overlay").classList.remove("visible");
};

window.submitNewExpense = async function() {
    const amount = document.getElementById("new-exp-amount").value;
    const category = document.getElementById("new-exp-category").value;
    const description = document.getElementById("new-exp-desc").value.trim();
    const email = getEmail();
    const statusEl = document.getElementById("create-exp-status");
    const btn = document.getElementById("create-exp-submit");

    if (!amount || !category || !description) {
        statusEl.textContent = "> ERR: MISSING_DATA";
        statusEl.className = "modal-status err";
        return;
    }

    btn.disabled = true;
    statusEl.textContent = "> SENDING...";

    try {
        const { response, data } = await apiCreateExpense(email, amount, category, description);
        if (response.ok && data.Status === "Success") {
            statusEl.textContent = "> SUCCESS: ID_" + data.id;
            statusEl.className = "modal-status ok";
            setTimeout(() => {
                closeCreateExpenseModal();
                loadDashboard(email);
                refreshCurrentTab();
            }, 800);
        } else {
            statusEl.textContent = "> ERR: " + (data.detail || "FAILED");
            statusEl.className = "modal-status err";
        }
    } catch (err) {
        statusEl.textContent = "> ERR: CONNECTION_LOST";
        statusEl.className = "modal-status err";
    } finally {
        btn.disabled = false;
    }
};
