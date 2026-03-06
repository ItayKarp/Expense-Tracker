from fastapi import APIRouter
from pydantic import EmailStr

from schemas import UpdateExpenses, CreateCategory,CreateExpense, UpdateProfileRequest,DeleteExpense
from services import get_expenses, dashboard_init_data, delete_expense as del_expense, \
     get_categories, update_expense_details, create_category, \
    create_expenses, update_profile_details

dashboard_router = APIRouter(tags=["dashboard"])




@dashboard_router.get("/data")
async def dashboard_data(email: EmailStr):
    return dashboard_init_data(email)


@dashboard_router.get("/expenses")
def expenses_table(email):
     return get_expenses(email)

@dashboard_router.put("/expense")
def update_expense(email:EmailStr,expense:UpdateExpenses,parameter):
    return update_expense_details(email,expense,parameter)


@dashboard_router.delete("/expense")
def delete_expense(email:EmailStr,expense_id:DeleteExpense):
    return del_expense(email,expense_id)

@dashboard_router.get("/categories")
def categories(email: EmailStr):
    return get_categories(email)


@dashboard_router.post("/categories")
def add_category(email:EmailStr,category:CreateCategory):
    return create_category(email,category)

@dashboard_router.post("/expenses")
def add_expense(email:EmailStr,expense:CreateExpense):
    return create_expenses(email,expense)


@dashboard_router.put("/profile")
def update_profile(payload: UpdateProfileRequest):
    return update_profile_details(
        old_email=payload.old_email,
        full_name=payload.full_name,
        email=payload.email,
        salary=payload.salary
    )
