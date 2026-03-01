from fastapi import APIRouter

statistics_router = APIRouter(tags=["statistics"])



@statistics_router.get("/dashboard/core")
def core_dashboard(email: str):
