import httpx
from fastapi import APIRouter, HTTPException, Request
from server.models import Accounts
from server.database import Session
from server.schemas import SignupRequest, LoginRequest, SetupRequest
from dotenv import load_dotenv
import os
load_dotenv()

authentication_router = APIRouter(tags=["authentication"])


NEON_BASE_AUTH = os.getenv("NEON_BASE_AUTH")

@authentication_router.post("/signup")
async def signup(body: SignupRequest, request: Request):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NEON_BASE_AUTH}/auth/sign-up/email",
            json={"name": body.name, "email": body.email, "password": body.password},
            headers={"Origin": str(request.base_url).rstrip("/")},
        )

    data = response.json()

    if not response.is_success:
        raise HTTPException(status_code=response.status_code, detail=data.get("message", "Signup failed"))

    return {"token": data["token"], "user": data["user"]}


@authentication_router.post("/login")
async def login(body: LoginRequest):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NEON_BASE_AUTH}/auth/sign-in/email",
            json={"email": body.email, "password": body.password},
            headers={"Content-Type": "application/json"}
        )

    if not response.is_success:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return response.json()


@authentication_router.post("/setup")
async def setup(body: SetupRequest):
    with Session() as session:
        existing = session.query(Accounts).filter(Accounts.email == body.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Account with this email already exists")

        try:
            user = Accounts(account_name=body.full_name, balance=body.balance, email=body.email)
            session.add(user)
            session.commit()
            session.refresh(user)
            return {"message": "Account created successfully", "account_id": user.id}
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create account: {str(e)}")


