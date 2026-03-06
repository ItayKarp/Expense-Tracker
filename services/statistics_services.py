import calendar
import io
from io import BytesIO

import pandas as pd
import numpy as np
from dateutil.relativedelta import relativedelta
from fastapi import HTTPException
from matplotlib import pyplot as plt
from matplotlib.figure import Figure
from matplotlib.ticker import FuncFormatter
from database import Session,engine
from models import Accounts, Expenses, Categories
import matplotlib
matplotlib.use('Agg')
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
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


def _render_hbar_plot(
    labels,
    values,
    title: str,
    bar_color: str,
    subtitle: str | None = None,
):
    """
    Clean modern vertical bar chart: categories on X, amount on Y.
    """
    with _PLOT_LOCK:
        labels = list(labels)
        values = np.array(list(values), dtype=float)

        if len(labels) == 0:
            labels = ["No Data"]
            values = np.array([0.0])

        # Sort descending so biggest bars are first (left)
        order = np.argsort(values)[::-1]
        labels = [labels[i] for i in order]
        values = values[order]

        fig = Figure(figsize=(11, 5.2), dpi=170)
        ax = fig.subplots()

        fig.patch.set_facecolor("white")
        ax.set_facecolor("white")

        bars = ax.bar(labels, values, color=bar_color, alpha=0.88)

        ax.grid(True, which="major", axis="y", linestyle="-", linewidth=0.8, alpha=0.18)
        ax.grid(False, axis="x")

        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_alpha(0.25)
        ax.spines["bottom"].set_alpha(0.25)

        ax.set_title(title, loc="left", fontsize=14, fontweight="bold", pad=16)

        if subtitle:
            ax.text(
                0.0, 1.02, subtitle,
                transform=ax.transAxes, fontsize=10, color="#666",
                va="bottom", ha="left",
            )

        ax.yaxis.set_major_formatter(FuncFormatter(_money))
        ax.tick_params(axis="y", labelsize=10)
        ax.tick_params(axis="x", labelsize=9)

        # Rotate long category names so they don't overlap
        for tick in ax.get_xticklabels():
            tick.set_rotation(25)
            tick.set_ha("right")

        # Add headroom so value labels don't get cut off
        maxv = float(np.max(values)) if len(values) else 0.0
        pad = max(1.0, maxv * 0.12)
        ax.set_ylim(0, maxv + pad)

        # Value labels above bars (kept inside axes)
        y_top = maxv + pad
        for bar in bars:
            h = float(bar.get_height())
            x = bar.get_x() + bar.get_width() / 2

            y_text = min(h + pad * 0.05, y_top * 0.92)
            ax.text(
                x,
                y_text,
                f"{_money(h, None)}",
                ha="center",
                va="bottom",
                fontsize=9,
                color="#333",
            )

        fig.tight_layout()
        buf = io.BytesIO()
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


def graph_month_expenses(email: str):
    with Session() as session:
        account = (
            session.query(Accounts)
            .filter(Accounts.email == email)
            .first()
        )

        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        now = datetime.now(timezone.utc)

        # Start 11 months back (so total = 12 months including current)
        start_month = (
            now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            - relativedelta(months=11)
        )

        month_expr = func.date_trunc("month", Expenses.created_at).label("month")

        rows = (
            session.query(
                month_expr,
                func.coalesce(func.sum(Expenses.amount), 0).label("total"),
            )
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= start_month)
            .group_by(month_expr)
            .order_by(month_expr)
            .all()
        )

        # Build lookup { "YYYY-MM": total }
        db_lookup = {
            r.month.strftime("%Y-%m"): float(r.total or 0)
            for r in rows
        }

        # Build full 12-month range (fill missing with 0)
        labels = []
        values = []

        current = start_month
        for _ in range(12):
            key = current.strftime("%Y-%m")
            labels.append(key)
            values.append(db_lookup.get(key, 0.0))
            current = current + relativedelta(months=1)

        return _render_hbar_plot(
            labels,
            values,
            "Expenses (Last 12 Months)",
            "#e74c3c",
            subtitle="Monthly totals",
        )


def expense_by_category(email: str):
    with Session() as session:
        account = session.query(Accounts).filter(Accounts.email == email).first()
        month = datetime.now(timezone.utc) - timedelta(days=30)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        rows = (
            session.query(
                Categories.name.label("category"),
                func.sum(Expenses.amount).label("total")
            )
            .join(Expenses, Categories.id == Expenses.category_id)
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= month)
            .group_by(Categories.name)
            .order_by(Categories.name)
            .all()
        )

        labels = [r.category for r in rows]
        values = [float(r.total or 0) for r in rows]

        total = float(sum(values) if values else 0)
        if total <= 0:
            return _render_hbar_plot(
                ["No expenses"],
                [0],
                "Expenses by Category",
                "#e74c3c",
                subtitle="This month",
            )

        # Keep it readable: top 8 + Others
        pairs = sorted(zip(labels, values), key=lambda t: t[1], reverse=True)
        top_n = 8
        top = pairs[:top_n]
        rest = pairs[top_n:]

        out_labels = [k for k, _ in top]
        out_vals = [v for _, v in top]

        others = float(sum(v for _, v in rest))
        if others > 0:
            out_labels.append("Others")
            out_vals.append(others)

        return _render_hbar_plot(
            out_labels,
            out_vals,
            "Expenses by Category",
            "#9b59b6",
            subtitle="Top categories (this month)",
        )


matplotlib.use("Agg")
def graph_income_vs_expense(email: str, months_back: int = 12) -> bytes:
    months_back = max(int(months_back), 1)

    with Session() as session:
        account = session.query(Accounts).filter(Accounts.email == email).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        income = float(account.salary or 0)

        now = datetime.now(timezone.utc)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=months_back - 1)

        month_expr = func.date_trunc("month", Expenses.created_at)

        rows = (
            session.query(
                month_expr.label("month"),
                func.coalesce(func.sum(Expenses.amount), 0).label("expenses"),
            )
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= start)
            .group_by(month_expr)
            .order_by(month_expr)
            .all()
        )

        # Key by (year, month) to avoid any string/timezone mismatches
        lookup = {(r.month.year, r.month.month): float(r.expenses or 0) for r in rows}

        labels = []
        exp_vals = []
        inc_vals = []
        years = []  # parallel list of years per tick

        cursor = start
        for _ in range(months_back):
            y, m = cursor.year, cursor.month
            labels.append(cursor.strftime("%b"))   # Jan, Feb, Mar...
            years.append(y)
            exp_vals.append(float(lookup.get((y, m), 0.0)))
            inc_vals.append(income)
            cursor = cursor + relativedelta(months=1)

        # figure
        with _PLOT_LOCK:
            fig = Figure(figsize=(12, 4.8), dpi=170)
            ax = fig.subplots()

            fig.patch.set_facecolor("white")
            ax.set_facecolor("white")

            x = np.arange(len(labels))
            width = 0.38

            income_color = "#2ecc71"
            expense_color = "#e74c3c"

            ax.bar(x - width / 2, inc_vals, width=width, label="Income", color=income_color, alpha=0.90)
            ax.bar(x + width / 2, exp_vals, width=width, label="Expenses", color=expense_color, alpha=0.90)

            ax.set_title("Income vs Expenses", loc="left", fontsize=14, fontweight="bold", pad=16)
            ax.text(
                0.0, 1.02, f"Last {months_back} months",
                transform=ax.transAxes, fontsize=10, color="#666",
                va="bottom", ha="left",
            )

            ax.set_ylabel("Amount", fontsize=11)
            ax.yaxis.set_major_formatter(FuncFormatter(_money))
            ax.grid(True, which="major", axis="y", linestyle="-", linewidth=0.8, alpha=0.18)
            ax.grid(False, axis="x")

            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.spines["left"].set_alpha(0.25)
            ax.spines["bottom"].set_alpha(0.25)

            ax.set_xticks(x)
            ax.set_xticklabels(labels)
            ax.tick_params(axis="x", labelrotation=0)
            for lab in ax.get_xticklabels():
                lab.set_ha("center")
                lab.set_fontsize(9)

            # ---- Add year labels across the top, centered over each year span ----
            # Find contiguous runs of the same year
            runs = []
            run_start = 0
            for i in range(1, len(years) + 1):
                if i == len(years) or years[i] != years[run_start]:
                    runs.append((years[run_start], run_start, i - 1))
                    run_start = i

            # Place year text in axis coordinates above plot area
            # Convert center x (data) -> axis fraction
            x_min, x_max = -0.5, len(labels) - 0.5
            for yr, a, b in runs:
                center = (a + b) / 2.0
                frac = (center - x_min) / (x_max - x_min)
                ax.text(
                    frac, 1.08, str(yr),
                    transform=ax.transAxes,
                    ha="center", va="bottom",
                    fontsize=10, color="#666",
                    fontweight="bold"
                )

            ax.legend(frameon=False, fontsize=10, loc="upper right")

            buf = BytesIO()
            fig.tight_layout()
            fig.savefig(buf, format="png", bbox_inches="tight")
            buf.seek(0)
            return buf.getvalue()


def get_dashboard_core(email: str) -> dict:
    """Return core statistics payload used by the Statistics view.

    Shape is expected by `static/home/js/statistics.js`:
      - balance: float
      - salary: float
      - month: {expenses, net, vs_last_month_percent}
      - projection: {daily_avg, projected_month_total}
      - categories: [{category_name, total, percent}]
      - trend: [{date, total}]
    """
    with Session() as session:
        account = session.query(Accounts).filter(Accounts.email == email).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        income = float(account.salary or 0)
        balance = float(account.balance or 0)

        now = datetime.now(timezone.utc)

        # Month boundaries (UTC)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_start = month_start - relativedelta(months=1)

        # Days info for projection
        days_elapsed = max((now.date() - month_start.date()).days + 1, 1)
        days_in_month = calendar.monthrange(month_start.year, month_start.month)[1]

        # Sums: this month + last month
        this_month_expenses = (
            session.query(func.coalesce(func.sum(Expenses.amount), 0))
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= month_start)
            .filter(Expenses.created_at <= now)
            .scalar()
        ) or 0

        last_month_expenses = (
            session.query(func.coalesce(func.sum(Expenses.amount), 0))
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= prev_month_start)
            .filter(Expenses.created_at < month_start)
            .scalar()
        ) or 0

        this_month_expenses = float(this_month_expenses)
        last_month_expenses = float(last_month_expenses)

        vs_last = 0.0
        if last_month_expenses > 0:
            vs_last = (this_month_expenses - last_month_expenses) / last_month_expenses

        net = income - this_month_expenses

        daily_avg = this_month_expenses / days_elapsed
        projected_month_total = daily_avg * days_in_month

        # Top categories (this month)
        cat_rows = (
            session.query(
                Categories.name.label("category_name"),
                func.coalesce(func.sum(Expenses.amount), 0).label("total"),
            )
            .join(Expenses, Categories.id == Expenses.category_id)
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= month_start)
            .filter(Expenses.created_at <= now)
            .group_by(Categories.name)
            .order_by(func.sum(Expenses.amount).desc())
            .all()
        )

        cats = []
        denom = this_month_expenses if this_month_expenses > 0 else 0.0
        for r in cat_rows:
            total = float(r.total or 0)
            cats.append(
                {
                    "category_name": r.category_name,
                    "total": total,
                    "percent": (total / denom) if denom else 0.0,
                }
            )

        # Daily trend: last 30 days, one point per day
        trend_start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_expr = func.date_trunc("day", Expenses.created_at)

        trend_rows = (
            session.query(
                day_expr.label("day"),
                func.coalesce(func.sum(Expenses.amount), 0).label("total"),
            )
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= trend_start)
            .filter(Expenses.created_at <= now)
            .group_by(day_expr)
            .order_by(day_expr.asc())
            .all()
        )

        trend_lookup = {r.day.date().isoformat(): float(r.total or 0) for r in trend_rows}

        trend = []
        cursor = trend_start.date()
        for _ in range(30):
            key = cursor.isoformat()
            trend.append({"date": key, "total": float(trend_lookup.get(key, 0))})
            cursor = cursor + timedelta(days=1)

        return {
            "balance": balance,
            "salary": income,
            "month": {
                "expenses": this_month_expenses,
                "net": net,
                "vs_last_month_percent": vs_last,
            },
            "projection": {
                "daily_avg": daily_avg,
                "projected_month_total": projected_month_total,
            },
            "categories": cats,
            "trend": trend,
        }

if __name__ == "__main__":
    graph_month_expenses("itaykarp@gmail.com")