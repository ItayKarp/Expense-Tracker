from pydantic import BaseModel

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str

class SetupRequest(BaseModel):
    full_name: str
    email: str
    balance: float|int