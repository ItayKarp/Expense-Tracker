from fastapi import HTTPException
from server.database import Session
from server.models import Accounts,Expenses
from sqlalchemy import func
from server.schemas import CreateAccount,ReadAccount
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def create_account(account_details: CreateAccount, parameter: str) -> ReadAccount:
    if parameter != "create":
        raise HTTPException(status_code=404, detail="Path not found")
    try:
        with Session(DATABASE_URL) as session:
            name = Accounts(account_name=account_details.account_name,balance=account_details.balance)
            session.add(name)
            session.commit()
            session.refresh(name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    #update pandas dataframe
    return ReadAccount.model_validate(name)

def get_accounts():
    try:
        with Session(DATABASE_URL) as session:
            accounts = session.query(Accounts).all()
            return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

def get_account(email, session) -> Accounts:
    account = session.query(Accounts).filter(Accounts.email == email).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def dashboard_init_data(email):
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
            "salary": account.salary
        }