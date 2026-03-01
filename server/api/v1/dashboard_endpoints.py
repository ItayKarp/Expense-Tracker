from fastapi import APIRouter, Response
from fastapi.security import HTTPBearer
import os
from dotenv import load_dotenv

from server.schemas import UpdateExpenses, CreateCategory,CreateExpense, UpdateProfileRequest,DeleteExpense
from server.services import get_expenses, dashboard_init_data, delete_expense as del_expense, \
    get_monthly_expenses, get_yearly_expenses, get_categories, update_expense_details, create_category, \
    create_expenses,graph_month_balance,graph_year_balance, update_profile_details

load_dotenv()

NEON_BASE_AUTH = os.getenv("NEON_BASE_AUTH")
JWKS_URL = f"{NEON_BASE_AUTH}/auth/jwks"

dashboard_router = APIRouter(tags=["dashboard"])
security = HTTPBearer()



@dashboard_router.get("/data")
async def dashboard_data(email):
    return dashboard_init_data(email)


@dashboard_router.get("/expenses")
def expenses_table(email):
     return get_expenses(email)

@dashboard_router.put("/expense")
def update_expense(email:str,expense:UpdateExpenses,parameter):
    return update_expense_details(email,expense,parameter)


@dashboard_router.delete("/expense")
def delete_expense(email:str,expense_id:DeleteExpense):
    return del_expense(email,expense_id)


@dashboard_router.get("/monthly_expenses")
def monthly_expenses(email):
    return get_monthly_expenses(email)


@dashboard_router.get("/yearly_expenses")
def yearly_expenses(email):
    return get_yearly_expenses(email)

@dashboard_router.get("/categories")
def categories(email: str):
    return get_categories(email)


@dashboard_router.post("/categories")
def add_category(email:str,category:CreateCategory):
    return create_category(email,category)

@dashboard_router.post("/expenses")
def add_expense(email:str,expense:CreateExpense):
    return create_expenses(email,expense)


@dashboard_router.get("/month_balance_graph")
def month_balance_graph(email: str):
    image_bytes = graph_month_balance(email)
    print("BYTES LENGTH:", len(image_bytes) if image_bytes else "None")
    return Response(content=image_bytes, media_type="image/png")

@dashboard_router.get("/year_balance_graph")
def year_balance_graph(email: str):
    image_bytes = graph_year_balance(email)
    return Response(content=image_bytes, media_type="image/png")


@dashboard_router.put("/profile")
def update_profile(payload: UpdateProfileRequest):
    return update_profile_details(
        old_email=payload.old_email,
        full_name=payload.full_name,
        email=payload.email,
        salary=payload.salary
    )