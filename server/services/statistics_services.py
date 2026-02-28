import calendar
import io
from typing import Tuple

import pandas as pd
import numpy as np
from matplotlib.figure import Figure
from matplotlib.ticker import FuncFormatter

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
        select(Expenses.amount)
        .where(Expenses.account_id == account_id)
        .where(Expenses.created_at >= start)
        .where(Expenses.created_at <= end)
    )
    return session.execute(stmt).scalar() or 0.0

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