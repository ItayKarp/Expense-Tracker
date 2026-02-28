from pathlib import Path
from fastapi import FastAPI,Request
from fastapi.responses import FileResponse,HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from server.database import Session
from server.api import authentication_router,dashboard_router

# from server.services import reroute

# Resolve plots dir relative to this file so save and serve use the same path
_SERVER_DIR = Path(__file__).resolve().parent
PLOTS_DIR = _SERVER_DIR / "static" / "plots"
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

templates = Jinja2Templates(directory="templates")


def get_db():
    db = Session

app = FastAPI(
    title="Book Library API",
    version="1.0.0",
    docs_url="/administrator123"
)


app.mount("/templates", StaticFiles(directory="templates"), name="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("home/home.html", {"request": request})


@app.get("/statistics")
def statistics():
    return FileResponse("templates/statistics/statistics.html")


app.include_router(
    authentication_router,
    prefix="/auth"
)

app.include_router(
    dashboard_router,
    prefix="/dashboard"
)

#
# app.include_router(
#     statistics_router,
#     prefix="/api/v1"
# )