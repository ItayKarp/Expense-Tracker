import os
from typing import Dict
from fastapi import HTTPException
import pandas as pd

from server.schemas import CreateAccount, ReadAccount
from server.database import Session
from server.models import Accounts
from dotenv import load_dotenv
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

def delete_account(account_id: int) -> Dict[str, str|int]:
    try:
        with Session(DATABASE_URL) as session:
            account = session.get(Accounts, account_id)
            if account is None:
                raise HTTPException(status_code=404, detail="Account not found")
            session.delete(account)
            session.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    #update pandas dataframe
    return {
        'Status': 'Success',
        'id': account_id
    }

def get_account(account_id: int):
    try:
        with Session(DATABASE_URL) as session:
            account = session.get(Accounts, account_id)
            if account is None:
                raise HTTPException(status_code=404, detail="Account not found")
            return account
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


def get_accounts():
    try:
        with Session(DATABASE_URL) as session:
            books = session.query(Accounts).all()
            return books
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


def update_details(account_id: int, new_account: CreateAccount, parameter: str) -> Dict[str, str | ReadAccount]:
    if parameter == "update_details":
        try:
            with Session(DATABASE_URL) as session:
                account = session.get(Accounts, account_id)
                if account is None:
                    raise HTTPException(status_code=404, detail="Account not found")
                account.account_name = new_account.account_name
                account.balance = new_account.balance
                session.commit()
                session.refresh(account)
                return {
                    "Status": "Success",
                    "updated_details": ReadAccount.model_validate(account)
                }
        except HTTPException:
            raise
    else:
        raise HTTPException(status_code=404, detail="Path not found")
