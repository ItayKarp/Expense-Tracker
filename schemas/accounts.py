from pydantic import BaseModel
from typing import Optional

class CreateAccount(BaseModel):
    account_name: str
    balance: float


class ReadAccount(BaseModel):
    account_name: str
    balance: float

class AccountResponse(BaseModel):
    status: str
    new_details: ReadAccount


class UpdateProfileRequest(BaseModel):
    old_email: str
    full_name: str
    email: str
    salary: Optional[float] = None