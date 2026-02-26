from sqlalchemy import func
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from server.models import Accounts, Expenses, Categories
from server.database import Session
from datetime import datetime, timedelta
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

NEON_BASE_AUTH = os.getenv("NEON_BASE_AUTH")
JWKS_URL = f"{NEON_BASE_AUTH}/auth/jwks"

dashboard_router = APIRouter(tags=["dashboard"])
security = HTTPBearer()





def get_account(email, session) -> Accounts:
    account = session.query(Accounts).filter(Accounts.email == email).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@dashboard_router.get("/data")
async def dashboard_data(email):
    with Session() as session:
        account = get_account(email, session)

        last_month = datetime.now() - timedelta(days=30)

        monthly_total = session.query(
            func.sum(Expenses.amount)
        ).filter(
            Expenses.created_at >= last_month,
            Expenses.account_id == account.id
        ).scalar()

        monthly_total = monthly_total if monthly_total is not None else 0

        return {
            "account_name": account.account_name,
            "balance": account.balance,
            "monthly_expenses": monthly_total,
        }


@dashboard_router.get("/expenses")
def expenses_table(email):
     with Session() as session:
        account = get_account(email, session)
        expenses = (
            session.query(
                Expenses.created_at,
                Expenses.description,
                Categories.name,
                Expenses.amount
            )
            .join(Categories)
            .filter(Expenses.account_id == account.id)
            .all()
        )
        return [row._asdict() for row in expenses]