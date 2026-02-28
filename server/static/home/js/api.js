// ── API.JS ────────────────────────────────────────────────
// All server communication lives here. Every function returns
// the raw { response, data } pair so callers decide what to do.

function getToken() {
    return localStorage.getItem("access_token");
}

export async function apiLogin(email, password) {
    const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    return { response, data };
}

export async function apiSignup(email, password, name) {
    const response = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
    });
    const data = await response.json();
    return { response, data };
}

export async function apiSetupAccount(balance, fullName, email) {
    const response = await fetch("/auth/setup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ balance: parseFloat(balance), full_name: fullName, email }),
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchDashboard(email) {
    const response = await fetch(`/dashboard/data?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchMonthlyExpenses(email) {
    const response = await fetch(`/dashboard/monthly_expenses?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchYearlyExpenses(email) {
    const response = await fetch(`/dashboard/yearly_expenses?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchAllExpenses(email) {
    const response = await fetch(`/dashboard/expenses?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchStatistics() {
    const response = await fetch("/statistics", {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchCategories(email) {
    // We append the accountId as a query parameter
    const response = await fetch(`/dashboard/categories?email=${email}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${getToken()}`,
            "Content-Type": "application/json"
        }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiDeleteExpense(email, expenseId) {
    const response = await fetch(`/dashboard/expense?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ expense_id: expenseId })
    });
    const data = await response.json();
    return { response, data };
}

export async function apiUpdateExpense(email, expenseId, amount, category, description) {
    const response = await fetch(
        `/dashboard/expense?email=${encodeURIComponent(email)}&parameter=update_details`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({ expense_id: expenseId, amount, category, description })
        }
    );
    const data = await response.json();
    return { response, data };
}

export async function apiCreateCategory(email, categoryName, monthlyBudget) {
    const response = await fetch(`/dashboard/categories?email=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            category_name: categoryName,
            monthly_budget: parseFloat(monthlyBudget)
        })
    });
    const data = await response.json();
    return { response, data };
}


export async function apiCreateExpense(email, amount, category, description) {
    const response = await fetch(`/dashboard/expenses?email=${encodeURIComponent(email)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            amount: parseFloat(amount),
            category: category,
            description: description
        })
    });
    const data = await response.json();
    return { response, data };
}

// --- GRAPH ENDPOINTS (return PNG bytes) ---
export async function apiFetchMonthBalanceGraph(email) {
  const response = await fetch(`/dashboard/month_balance_graph?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  const blob = await response.blob();
  return { response, blob };
}

export async function apiFetchYearBalanceGraph(email) {
  const response = await fetch(`/dashboard/year_balance_graph?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  const blob = await response.blob();
  return { response, blob };
}