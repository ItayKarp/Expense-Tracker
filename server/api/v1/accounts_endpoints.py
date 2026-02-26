from fastapi import APIRouter
from server.services import get_accounts, get_account, create_account, update_details, delete_account
from server.schemas import CreateAccount, ReadAccount,BookDeleteResponse
from typing import List

book_router = APIRouter(
    prefix="/books",
    tags=["books"],
)

@book_router.get("/{account_id}")
async def get_account_details(account_id: int):
    return get_account(account_id)


@book_router.get("/", response_model = List[ReadAccount])
async def get_account_list():
    return get_accounts()


@book_router.post("/", response_model=ReadAccount, status_code=201)
async def create_new_account(book: CreateAccount, type: str= None):
    return create_account(book, type)


@book_router.put("/{account_id}")
async def update_account_details(account_id: int, book: CreateAccount, type: str= None):
    return update_details(account_id, book, type)


@book_router.delete("/{account_id}", response_model=BookDeleteResponse)
async def delete_existing_account(account_id: int):
    return delete_account(account_id)

