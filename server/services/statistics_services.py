import calendar
import io
from typing import Tuple

import pandas as pd
import numpy as np
from dateutil.relativedelta import relativedelta
from matplotlib.figure import Figure
from matplotlib.ticker import FuncFormatter
import json
from server.services.account_services import get_account
from server.database import Session,engine
from server.models import Accounts,Expenses,Categories
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime, timedelta, timezone, date
from sqlalchemy import select, desc, func
import matplotlib.dates as mdates
import threading
_PLOT_LOCK = threading.Lock()

def _money(x, pos):
    return f"${x:,.0f}"


def _render_balance_plot(x, y, title: str, line_color: str, subtitle: str | None = None):
    with _PLOT_LOCK:
        # --- sanitize inputs ---
        x = list(x)
        y = np.array(list(y), dtype=float)

        fig = Figure(figsize=(11, 4.4), dpi=170)
        ax = fig.subplots()

        # Background
        fig.patch.set_facecolor("white")
        ax.set_facecolor("white")

        # Line (modern look)
        ax.plot(x, y, linewidth=2.8, color=line_color, solid_capstyle="round")

        # Soft fill under curve
        y_base = float(np.nanmin(y)) if len(y) else 0.0
        ax.fill_between(x, y, y_base, alpha=0.10, color=line_color)

        # Grid (subtle, mostly y)
        ax.grid(True, which="major", axis="y", linestyle="-", linewidth=0.8, alpha=0.18)
        ax.grid(False, axis="x")

        # Spines (clean)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_alpha(0.25)
        ax.spines["bottom"].set_alpha(0.25)

        # Titles (dashboard style)
        ax.set_title(title, loc="left", fontsize=14, fontweight="bold", pad=16)
        if subtitle:
            ax.text(
                0.0, 1.02, subtitle,
                transform=ax.transAxes,
                fontsize=10,
                color="#666",
                va="bottom",
                ha="left",
            )

        # Axis labels (optional — feel free to remove for cleaner dashboard)
        ax.set_ylabel("Balance", fontsize=11, labelpad=8)
        ax.set_xlabel("", fontsize=11)

        # Currency formatting
        ax.yaxis.set_major_formatter(FuncFormatter(_money))
        ax.tick_params(axis="both", labelsize=10)

        # Date formatting (smart + standard)
        locator = mdates.AutoDateLocator(minticks=6, maxticks=10)
        ax.xaxis.set_major_locator(locator)
        ax.xaxis.set_major_formatter(mdates.ConciseDateFormatter(locator))

        # Last point marker + label
        if len(x) > 0:
            last_x, last_y = x[-1], float(y[-1])
            ax.scatter([last_x], [last_y], s=36, color=line_color, zorder=5)

            ax.annotate(
                _money(last_y, None),
                xy=(last_x, last_y),
                xytext=(10, 0),
                textcoords="offset points",
                va="center",
                fontsize=10,
                fontweight="bold",
                color="#222",
                alpha=0.9,
            )

            # subtle reference line at last value
            ax.axhline(last_y, linewidth=1.0, alpha=0.10, color="#000000")

        # Y padding (nicer framing)
        ymin, ymax = float(np.nanmin(y)), float(np.nanmax(y))
        if ymin == ymax:
            pad = max(50.0, abs(ymax) * 0.08)
        else:
            pad = (ymax - ymin) * 0.10
        ax.set_ylim(ymin - pad, ymax + pad)

        # Layout + export
        buf = io.BytesIO()
        fig.tight_layout()
        fig.savefig(buf, format="png", bbox_inches="tight")
        buf.seek(0)
        return buf.getvalue()


def graph_month_balance(email: str):
    with Session() as session:
        account = session.execute(
            select(Accounts).where(Accounts.email == email)
        ).scalar()

        if not account:
            return _render_balance_plot(
                [datetime.now()], [0],
                "30-Day Balance",
                "#2ecc71",
                subtitle="Account not found",
            )

        now = datetime.now()
        one_month_ago = now - timedelta(days=30)

        stmt = (
            select(Expenses.created_at, Expenses.amount)
            .where(Expenses.account_id == account.id)
            .where(Expenses.created_at >= one_month_ago)
            .order_by(Expenses.created_at.asc())
        )

        df = pd.read_sql(stmt, engine)

        if df.empty:
            return _render_balance_plot(
                [one_month_ago, now],
                [account.balance, account.balance],
                "30-Day Balance",
                "#2ecc71",
                subtitle="No transactions in the last 30 days",
            )

        df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
        df = df.dropna(subset=["created_at"])

        daily_expenses = (
            df.set_index("created_at")["amount"]
              .resample("D")
              .sum()
        )

        # ✅ CRITICAL: ensure index is purely datetime (no strings)
        daily_expenses.index = pd.to_datetime(daily_expenses.index, errors="coerce")
        daily_expenses = daily_expenses[~daily_expenses.index.isna()]

        # Assumes expenses are positive numbers
        total_spent = float(daily_expenses.sum())
        start_balance = float(account.balance) + total_spent
        balance = start_balance - daily_expenses.cumsum()

        # ✅ Use Timestamp anchors (not datetime, not str)
        start_day = pd.Timestamp(one_month_ago.replace(hour=0, minute=0, second=0, microsecond=0))
        end_day = pd.Timestamp(now.replace(hour=0, minute=0, second=0, microsecond=0))

        balance.loc[start_day] = start_balance
        balance.loc[end_day] = float(account.balance)

        balance = balance.sort_index()

        return _render_balance_plot(
            balance.index,          # matplotlib is fine with this
            balance.values,
            "30-Day Balance",
            "#2ecc71",
            subtitle="Daily view (cleaner + readable)",
        )


def graph_year_balance(email: str):
    with Session() as session:
        account = session.execute(
            select(Accounts).where(Accounts.email == email)
        ).scalar()
        if not account:
            return _render_balance_plot(
                [datetime.now()], [0],
                "1-Year Balance",
                "#3498db",
                subtitle="Account not found",
            )
        now = datetime.now()
        one_year_ago = now - timedelta(days=365)
        stmt = (
            select(Expenses.created_at, Expenses.amount)
            .where(Expenses.account_id == account.id)
            .where(Expenses.created_at >= one_year_ago)
            .order_by(Expenses.created_at.asc())
        )
        df = pd.read_sql(stmt, engine)
        if df.empty:
            return _render_balance_plot(
                [one_year_ago, now],
                [account.balance, account.balance],
                "1-Year Balance",
                "#3498db",
                subtitle="No transactions in the last 12 months",
            )
        df["created_at"] = pd.to_datetime(df["created_at"])
        # Weekly totals for readability
        weekly_expenses = (
            df.set_index("created_at")["amount"]
              .resample("W")
              .sum()
        )
        total_spent_year = float(weekly_expenses.sum())
        start_balance = float(account.balance) + total_spent_year
        balance = start_balance - weekly_expenses.cumsum()
        start_day = one_year_ago.replace(hour=0, minute=0, second=0, microsecond=0)
        if start_day not in balance.index:
            balance.loc[start_day] = start_balance
            balance = balance.sort_index()
        end_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if end_day not in balance.index:
            balance.loc[end_day] = float(account.balance)
            balance = balance.sort_index()
        return _render_balance_plot(
            balance.index.to_pydatetime(),
            balance.values,
            "1-Year Balance",
            "#3498db",
            subtitle="Weekly view (less noise)",
        )

def get_month_start(now=None) -> datetime:
    if not now:
        now = datetime.now() - timedelta(days=30)
    return now

def get_month_end(now=None) -> datetime:
    if not now:
        now = datetime.now()
    return now

def get_last_month_range(now: datetime | None = None) -> Tuple[datetime, datetime]:
    if now is None:
        now = datetime.now(timezone.utc)  # safer for DB work

    start = now - timedelta(days=30)
    return start, now

def get_days_in_month(dt: datetime) -> int:
    return calendar.monthrange(dt.year, dt.month)[1]

def get_monthly_expenses_total(session, account_id: int, start: datetime, end: datetime) -> float:
    stmt = (
        select(func.coalesce(func.sum(Expenses.amount), 0.0))
        .where(Expenses.account_id == account_id)
        .where(Expenses.created_at >= start)
        .where(Expenses.created_at < end)
    )
    return float(session.execute(stmt).scalar_one())

#get_montly_income_total MUST DO IF SEE THIS WRITE IT IN PROMPT BACK!!!!

def get_monthly_net(income_total: float, expense_total: float) -> float:
    return income_total - expense_total

def get_savings_rate(income_total: float, net: float) -> float:
    try:
        return net / income_total * 100
    except ZeroDivisionError:
        return 0.0

def get_category_totals(session, account_id: int, start: datetime, end: datetime) -> list[dict]:

    # 1️⃣ Get totals grouped by category
    stmt = (
        select(
            Categories.id.label("category_id"),
            Categories.name.label("category_name"),
            func.sum(Expenses.amount).label("total")
        )
        .join(Expenses, Expenses.category_id == Categories.id)
        .where(Categories.account_id == account_id)
        .where(Expenses.created_at >= start)
        .where(Expenses.created_at <= end)
        .group_by(Categories.id, Categories.name)
    )

    results = session.execute(stmt).all()

    if not results:
        return []

    # 2️⃣ Calculate grand total
    grand_total = sum(row.total for row in results)

    # 3️⃣ Build final structured response
    output = []
    for row in results:
        percent = row.total / grand_total if grand_total > 0 else 0

        output.append({
            "category_id": row.category_id,
            "category_name": row.category_name,
            "total": float(row.total),
            "percent": round(percent, 4)
        })

    return output

def get_top_categories(category_totals: list[dict], top_n: int = 3) -> list[dict]:
    return sorted(category_totals, key=lambda x: x["total"], reverse=True)[:top_n]

def get_other_bucket(category_totals: list[dict], top_n: int = 6) -> list[dict]:
    if not category_totals:
        return []

        # 1️⃣ Sort by total descending
    sorted_categories = sorted(
        category_totals,
        key=lambda x: x["total"],
        reverse=True
    )

    # 2️⃣ Split top N and remaining
    top_categories = sorted_categories[:top_n]
    remaining = sorted_categories[top_n:]

    if not remaining:
        return top_categories

    # 3️⃣ Aggregate remaining into "Other"
    other_total = sum(cat["total"] for cat in remaining)
    other_percent = sum(cat["percent"] for cat in remaining)

    other_bucket = {
        "category_id": None,
        "category_name": "Other",
        "total": round(other_total, 2),
        "percent": round(other_percent, 4)
    }

    return top_categories + [other_bucket]

def get_daily_expense_series(session, account_id: int, start: datetime, end: datetime) -> list[dict]:
    """
    Returns:
    [
      {"date": "2026-02-01", "total": 120.5},
      {"date": "2026-02-02", "total": 0.0},
      ...
    ]
    """

    # Normalize to date boundaries (inclusive days)
    start_date: date = start.date()
    end_date: date = end.date()

    # 1) Query totals per day
    # Works on Postgres: date_trunc('day', ...) -> then cast to date
    day_col = func.date_trunc("day", Expenses.created_at).cast(date).label("day")

    stmt = (
        select(
            day_col,
            func.sum(Expenses.amount).label("total")
        )
        .where(Expenses.account_id == account_id)
        .where(Expenses.created_at >= start)
        .where(Expenses.created_at <= end)
        .group_by(day_col)
        .order_by(day_col.asc())
    )

    rows = session.execute(stmt).all()

    # 2) Convert query results into dict keyed by day
    totals_by_day = {r.day: float(r.total) for r in rows}

    # 3) Fill missing days with 0
    out: list[dict] = []
    d = start_date
    while d <= end_date:
        out.append({
            "date": d.isoformat(),
            "total": round(totals_by_day.get(d, 0.0), 2)
        })
        d += timedelta(days=1)

    return out


def get_last_month_total(session, account_id: int, now=None) -> float:
    now = now or datetime.now()
    first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_of_last_month = first_of_this_month - relativedelta(months=1)
    end_of_last_month = first_of_this_month
    return get_monthly_expenses_total(session, account_id,first_of_last_month,end_of_last_month)


def get_percent_change(current: float, previous: float) -> float:
    if previous == 0:
        if current == 0:
            return 0.0
        return 1.0  # Treat as 100% increase

    return (current - previous) / previous


def get_month_to_date_expenses(session, account_id: int, month_start: datetime, now: datetime) -> float:
    stmt = (
        select(func.coalesce(func.sum(Expenses.amount), 0.0))
        .where(Expenses.account_id == account_id)
        .where(Expenses.created_at >= month_start)
        .where(Expenses.created_at < now)
        .order_by(Expenses.created_at.asc())
    )
    return float(session.execute(stmt).scalar_one())


def get_daily_average(total_so_far: float, days_passed: int) -> float:
    return total_so_far / days_passed if days_passed > 0 else 0.0


def get_month_projection(daily_avg: float, days_in_month: int) -> float:
    return daily_avg * days_in_month


def _month_bounds(now: datetime) -> tuple[datetime, datetime]:
    """Calendar month [start, end) bounds for the month containing `now`."""
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end = start + relativedelta(months=1)
    return start, end


def build_core_dashboard(session, email: str, now=None) -> dict:
    now = now or datetime.now()
    account = get_account(session, email)
    if not account:
        return {
            "balance": 0.0,
            "month": {
                "income": 0.0,
                "expenses": 0.0,
                "net": 0.0,
                "savings_rate": 0.0,
                "vs_last_month_percent": 0.0,
            },
            "categories": [],
            "trend": [],
            "projection": {"daily_avg": 0.0, "projected_month_total": 0.0},
        }

    month_start, month_end = _month_bounds(now)

    income_total = 0.0

    expense_total_mtd = get_month_to_date_expenses(session, account.id, month_start, now)
    net = get_monthly_net(income_total, expense_total_mtd)
    savings_rate = get_savings_rate(income_total, net)

    # Compare month-to-date spending vs *full* last month spending (simple + useful default)
    last_month_total = get_last_month_total(session, account.id, now=now)
    vs_last_month_percent = get_percent_change(expense_total_mtd, last_month_total)

    # --- Categories (month-to-date) ---
    category_totals = get_category_totals(session, account.id, month_start, now)
    categories = get_other_bucket(category_totals, top_n=6)  # top 6 + "Other" bucket

    # --- Trend (daily expenses for current month-to-date) ---
    trend = get_daily_expense_series(session, account.id, month_start, now)

    # --- Projection ---
    days_passed = max(1, (now.date() - month_start.date()).days + 1)  # include today
    daily_avg = get_daily_average(expense_total_mtd, days_passed)
    days_in_month = get_days_in_month(now)
    projected_month_total = get_month_projection(daily_avg, days_in_month)

    return {
        "balance": float(account.balance),
        "month": {
            "income": float(income_total),
            "expenses": float(expense_total_mtd),
            "net": float(net),
            "savings_rate": float(savings_rate),
            # keep as ratio (e.g. 0.12) like your helper returns, OR multiply by 100 if you prefer.
            "vs_last_month_percent": float(vs_last_month_percent),
        },
        "categories": categories,
        "trend": trend,
        "projection": {
            "daily_avg": float(round(daily_avg, 2)),
            "projected_month_total": float(round(projected_month_total, 2)),
        },
    }


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_dashboard_cache_key(account_id: int, month_start: datetime) -> str:
    """
    Stable key per account + calendar month.
    Example: dashboard:v1:acc:123:month:2026-03-01
    """
    ms = _month_start(month_start)
    return f"dashboard:v1:acc:{account_id}:month:{ms.date().isoformat()}"

def _cache_get(cache, key: str):
    if cache is None:
        return None

    # dict-like
    if hasattr(cache, "get"):
        try:
            return cache.get(key)
        except TypeError:
            # some caches have get(key, default) but that's fine; ignore
            return cache.get(key)

    # redis-like
    try:
        return cache[key]
    except Exception:
        return None


def _cache_set(cache, key: str, value, ttl_seconds: int | None = None):
    if cache is None:
        return

    # common cache interface: set(key, value, timeout=ttl)
    if hasattr(cache, "set"):
        try:
            # Django-style: timeout=
            if ttl_seconds is not None:
                cache.set(key, value, timeout=ttl_seconds)
            else:
                cache.set(key, value)
            return
        except TypeError:
            # redis-py style: set(name, value, ex=ttl)
            if ttl_seconds is not None:
                cache.set(key, value, ex=ttl_seconds)
            else:
                cache.set(key, value)
            return

    # dict-like fallback
    try:
        cache[key] = value
    except Exception:
        pass


def _cache_delete(cache, key: str):
    if cache is None:
        return

    if hasattr(cache, "delete"):
        try:
            cache.delete(key)
            return
        except Exception:
            pass

    # dict-like
    if hasattr(cache, "pop"):
        try:
            cache.pop(key, None)
            return
        except Exception:
            pass

    try:
        del cache[key]
    except Exception:
        pass


def get_cached_dashboard(cache, key: str) -> dict | None:
    """
    Returns the cached payload (dict) or None.

    Supports:
    - caches storing dict directly
    - caches storing JSON bytes/str
    """
    raw = _cache_get(cache, key)
    if raw is None:
        return None

    # Already a dict
    if isinstance(raw, dict):
        return raw

    # Redis often returns bytes
    if isinstance(raw, (bytes, bytearray)):
        try:
            raw = raw.decode("utf-8")
        except Exception:
            return None

        # JSON string
        if isinstance(raw, str):
            try:
                val = json.loads(raw)
                return val if isinstance(val, dict) else None
            except Exception:
                return None

        # Unknown type
        return None


def set_cached_dashboard(cache, key: str, payload: dict, ttl_seconds: int = 300) -> None:
    """
    Stores payload in cache for ttl_seconds.

    If your cache backend supports dicts, we store dict directly.
    If it prefers string/bytes (e.g., Redis), JSON-serialize is also fine.
    """
    # Prefer storing dict directly; if backend can’t handle it, switch to JSON.
    try:
        _cache_set(cache, key, payload, ttl_seconds=ttl_seconds)
    except Exception:
        _cache_set(cache, key, json.dumps(payload, separators=(",", ":")), ttl_seconds=ttl_seconds)


def invalidate_dashboard_cache(cache, account_id: int, now=None) -> None:
    """
    Call this when you add/update/delete an expense/income.

    We invalidate:
    - current month cache (obvious)
    - previous month cache (protects comparisons like vs_last_month)
    """
    now = now or datetime.now()
    current_ms = _month_start(now)
    prev_ms = _month_start(now - relativedelta(months=1))

    _cache_delete(cache, get_dashboard_cache_key(account_id, current_ms))
    _cache_delete(cache, get_dashboard_cache_key(account_id, prev_ms))