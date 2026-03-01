from datetime import datetime, timezone
from fastapi import APIRouter
from server.database import Session
from server.services.account_services import get_account
from server.services.statistics_services import (
    build_core_dashboard,
    get_month_start,
    get_dashboard_cache_key,
    get_cached_dashboard,
    set_cached_dashboard,
    invalidate_dashboard_cache,
)

statistics_router = APIRouter(tags=["statistics"])



_DASHBOARD_CACHE: dict[str, dict] = {}


@statistics_router.get("/dashboard/core")
def core_dashboard(email: str):
    """
    One payload the UI can render in a single request:
    {
      balance,
      month:{income, expenses, net, savings_rate, vs_last_month_percent},
      categories:[...],
      trend:[...],
      projection:{daily_avg, projected_month_total}
    }
    """
    now = datetime.now(timezone.utc)

    with Session() as session:
        account = get_account(email, session)  # raises 404 if not found

        month_start = get_month_start(now)
        key = get_dashboard_cache_key(account.id, month_start)

        cached = get_cached_dashboard(_DASHBOARD_CACHE, key)
        if cached is not None:
            return cached

        payload = build_core_dashboard(session, email, now=now)
        set_cached_dashboard(_DASHBOARD_CACHE, key, payload, ttl_seconds=300)
        return payload


@statistics_router.get("/dashboard/core/trend")
def core_trend(email: str):
    """
    Trend only (daily totals for the current month-to-date).
    """
    data = core_dashboard(email)
    return {
        "trend": data.get("trend", []),
        "month": data.get("month", {}),
    }


@statistics_router.get("/dashboard/core/categories")
def core_categories(email: str):
    """
    Categories only (top buckets + other).
    """
    data = core_dashboard(email)
    return {
        "categories": data.get("categories", []),
        "month": data.get("month", {}),
    }


# Optional: useful while developing/testing
@statistics_router.post("/dashboard/core/invalidate")
def invalidate_core_dashboard(email: str):
    now = datetime.now(timezone.utc)
    with Session() as session:
        account = get_account(email, session)
        invalidate_dashboard_cache(_DASHBOARD_CACHE, account.id, now=now)
    return {"ok": True}