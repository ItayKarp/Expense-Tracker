from pathlib import Path
from fastapi import FastAPI
from api import authentication_router, dashboard_router, statistics_router


# Resolve plots dir relative to this file, so save and serve use the same path
_SERVER_DIR = Path(__file__).resolve().parent
PLOTS_DIR = _SERVER_DIR / "static" / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title="Expenses Tracking API",
    version="1.0",
    docs_url="/administrator123"
)



app.include_router(
    authentication_router,prefix="/api/v1/auth")

app.include_router(
    dashboard_router,
    prefix="/api/v1/dashboard"
)


app.include_router(
    statistics_router,
    prefix="/api/v1/statistics",
    tags=["Statistics"]
)
