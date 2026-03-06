from fastapi import APIRouter
from fastapi.responses import Response

from schemas import CreateExpense
from services import graph_month_balance, graph_year_balance, get_monthly_expenses, get_yearly_expenses, \
    create_expenses, get_expenses, get_dashboard_core, graph_income_vs_expense, expense_by_category, graph_month_expenses

statistics_router = APIRouter(tags=["statistics"])

@statistics_router.get("/month_balance_graph")
def month_balance_graph(email: str):
    image_bytes = graph_month_balance(email)
    return Response(content=image_bytes, media_type="image/png")

@statistics_router.get("/yearly_balance_graph")
def yearly_balance_graph(email: str):
    image_bytes = graph_year_balance(email)
    return Response(content=image_bytes, media_type="image/png")

@statistics_router.get("/monthly_expenses")
def get_month_expenses(email: str):
    return get_monthly_expenses(email)

@statistics_router.get("/yearly_expenses")
def get_year_expenses(email: str):
    return get_yearly_expenses(email)

@statistics_router.post("/expenses")
def add_expense(email:str,expense:CreateExpense):
    return create_expenses(email,expense)


@statistics_router.get("/expenses")
def expenses_table(email):
     return get_expenses(email)

@statistics_router.get("/core")
def dashboard_core(email):
    return get_dashboard_core(email)

@statistics_router.get("/income_vs_expenses_graph")
def income_vs_expenses_graph(email: str, months_back: int = 12):
    image_bytes = graph_income_vs_expense(email=email, months_back=months_back)
    return Response(content=image_bytes, media_type="image/png")

@statistics_router.get("/expenses_by_category")
def expenses_by_category(email: str):
    image_bytes = expense_by_category(email)
    return Response(content=image_bytes, media_type="image/png")


@statistics_router.get("/expenses_by_months")
def expenses_by_months(email: str):
    image_bytes = graph_month_expenses(email)
    return Response(content=image_bytes, media_type="image/png")