from pydantic import BaseModel
class CreateAccount(BaseModel):
    account_name: str
    balance: float


class ReadAccount(BaseModel):
    account_name: str
    balance: float

class AccountResponse(BaseModel):
    status: str
    new_details: ReadAccount

class BookDeleteResponse(BaseModel):
    status: str
    id: int