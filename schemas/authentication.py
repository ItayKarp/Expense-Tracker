from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SetupRequest(BaseModel):
    full_name: str
    email: EmailStr
    balance: float|int


class RequestPasswordReset(BaseModel):
    email: EmailStr
    redirectTo: str

class ResetPassword(BaseModel):
    token: str
    newPassword: str