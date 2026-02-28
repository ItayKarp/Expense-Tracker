import os
from typing import Dict
from fastapi import HTTPException
import pandas as pd
from datetime import datetime, timedelta

from server.schemas.expenses import DeleteExpense
from server.services.account_services import get_account
from server.schemas import UpdateExpenses, CreateExpense
from server.database import Session
from server.models import Accounts, Expenses, Categories
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def create_expenses(email:str, expense: CreateExpense) -> Dict[str, str]:
    try:
        with Session() as session:
            account = session.query(Accounts).filter(Accounts.email == email).first()
            if account is None:
                raise HTTPException(status_code=404, detail="Account not found")
            category_id = session.query(Categories.id).filter(expense.category == Categories.name).scalar()
            new_expense = Expenses(account_id=account.id, description=expense.description, amount=expense.amount, category_id=category_id)
            session.add(new_expense)
            account.balance -= expense.amount
            session.commit()
            session.refresh(new_expense)
            session.refresh(account)
            # update pandas dataframe
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    return {
        "Status": "Success",
        "id": new_expense.id
    }


def delete_expense(email:str, expense: DeleteExpense) -> Dict[str, str|int]:
    try:
        with Session() as session:
            account = session.query(Accounts).filter(Accounts.email == email).first()
            expense = session.query(Expenses).filter(Expenses.account_id == account.id).filter(Expenses.id == expense.expense_id).first()
            if expense is None:
                raise HTTPException(status_code=404, detail="Expense not found")
            account.balance += expense.amount
            session.delete(expense)
            expense_id = expense.id
            session.commit()
            session.refresh(account)
            # update pandas dataframe
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    return {
        'Status': 'Success',
        'id': expense_id
    }


def update_expense_details(email: str, expense_details: UpdateExpenses, parameter: str) -> Dict[str, str | UpdateExpenses]:
    if parameter == "update_details":
        try:
            with Session() as session:
                account_id = session.query(Accounts.id).filter(Accounts.email == email).scalar()
                category_id = session.query(Categories.id).filter(Categories.name == expense_details.category).scalar()
                expense = session.query(Expenses).filter(Expenses.account_id == account_id).filter(Expenses.id == expense_details.expense_id).first()
                if expense is None:
                    raise HTTPException(status_code=404, detail="Expense not found")
                expense.amount = expense_details.amount
                expense.description = expense_details.description
                expense.category_id = category_id
                session.commit()
                session.refresh(expense)
                return {
                    "Status": "Success",
                    "updated_details": {
                        "expense_id": expense.id,
                        "amount": expense.amount,
                        "description": expense.description,
                        "category_id": expense.category_id
                    }
                }
        except HTTPException:
            raise
    else:
        raise HTTPException(status_code=404, detail="Path not found")


def get_expenses(email):
    with Session() as session:
        account = get_account(email, session)
        expenses = (
            session.query(
                Expenses.created_at,
                Expenses.description,
                Categories.name,
                Expenses.amount,
                Expenses.id
            )
            .join(Categories)
            .filter(Expenses.account_id == account.id)
            .all()
        )
        return [row._asdict() for row in expenses]


def get_monthly_expenses(email):
    with Session() as session:
        account = get_account(email, session)
        last_month = datetime.now() - timedelta(days=30)
        expenses = (
            session.query(
                Expenses.created_at,
                Expenses.description,
                Categories.name,
                Expenses.amount,
                Expenses.id
            )
            .join(Categories)
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= last_month)
            .all()
        )
        return [row._asdict() for row in expenses]


def get_yearly_expenses(email):
    with Session() as session:
        account = get_account(email, session)
        last_year = datetime.now() - timedelta(days=365)
        expenses = (
            session.query(
                Expenses.created_at,
                Expenses.description,
                Categories.name,
                Expenses.amount,
                Expenses.id
            )
            .join(Categories)
            .filter(Expenses.account_id == account.id)
            .filter(Expenses.created_at >= last_year)
            .all()
        )
        return [row._asdict() for row in expenses]