// ── API.JS ────────────────────────────────────────────────
// All server communication lives here. Every function returns
// the raw { response, data } pair so callers decide what to do.

function getToken() {
    return localStorage.getItem("access_token");
}

export async function apiLogin(email, password) {
    const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    return { response, data };
}

export async function apiSignup(email, password, name) {
    const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
    });
    const data = await response.json();
    return { response, data };
}

export async function apiSetupAccount(balance, fullName, email) {
    const response = await fetch("/api/v1/auth/setup", {
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
    const response = await fetch(`/api/v1/dashboard/data?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchMonthlyExpenses(email) {
    const response = await fetch(`/api/v1/statistics/monthly_expenses?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchYearlyExpenses(email) {
    const response = await fetch(`/api/v1/statistics/yearly_expenses?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchAllExpenses(email) {
    const response = await fetch(`/api/v1/statistics/expenses?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    const data = await response.json();
    return { response, data };
}

export async function apiFetchStatistics(email) {
  const response = await fetch(
    `/api/v1/statistics/core?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: { "Authorization": `Bearer ${getToken()}` }
    }
  );
  const data = await response.json();
  return { response, data };
}

export async function apiFetchCategories(email) {
    // We append the accountId as a query parameter
    const response = await fetch(`/api/v1/dashboard/categories?email=${email}`, {
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
    const response = await fetch(`/api/v1/dashboard/expense?email=${encodeURIComponent(email)}`, {
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
        `/api/v1/dashboard/expense?email=${encodeURIComponent(email)}&parameter=update_details`,
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
    const response = await fetch(`/api/v1/dashboard/categories?email=${encodeURIComponent(email)}`, {
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
    const response = await fetch(`/api/v1/dashboard/expenses?email=${encodeURIComponent(email)}`, {
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
  const response = await fetch(`/api/v1/statistics/month_balance_graph?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  const blob = await response.blob();
  return { response, blob };
}

export async function apiFetchYearBalanceGraph(email) {
  const response = await fetch(`/api/v1/statistics/yearly_balance_graph?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });

  const blob = await response.blob();
  return { response, blob };
}

// --- STATISTICS GRAPHS (return PNG bytes) ---
export async function apiFetchIncomeVsExpensesGraph(email, monthsBack = 12) {
  const response = await fetch(
    `/api/v1/statistics/income_vs_expenses_graph?email=${encodeURIComponent(email)}&months_back=${encodeURIComponent(monthsBack)}`,
    {
      method: "GET",
      headers: { "Authorization": `Bearer ${getToken()}` },
    }
  );

  const blob = await response.blob();
  return { response, blob };
}

export async function apiFetchExpensesByCategoryGraph(email) {
  const response = await fetch(
    `/api/v1/statistics/expenses_by_category?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: { "Authorization": `Bearer ${getToken()}` },
    }
  );

  const blob = await response.blob();
  return { response, blob };
}

export async function apiFetchExpensesByMonthsGraph(email) {
  const response = await fetch(
    `/api/v1/statistics/expenses_by_months?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: { "Authorization": `Bearer ${getToken()}` },
    }
  );

  const blob = await response.blob();
  return { response, blob };
}

export async function apiUpdateProfileDetails(old_email, full_name, email, salary) {
  const token = localStorage.getItem("token");

  const res = await fetch("/api/v1/dashboard/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      old_email,     // backend can use this to locate the account
      full_name,     // update fields
      email,
      salary,
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    // make FastAPI errors readable
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }

  return data;
}

export async function apiRequestPasswordReset(email, redirectTo) {
  const res = await fetch(`/api/v1/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo }),
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function apiResetPassword(token, newPassword) {
  const res = await fetch(`/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}