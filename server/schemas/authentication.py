from pydantic import BaseModel, EmailStr

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


class RequestPasswordReset(BaseModel):
    email: EmailStr
    redirectTo: str

class ResetPassword(BaseModel):
    token: str
    newPassword: str