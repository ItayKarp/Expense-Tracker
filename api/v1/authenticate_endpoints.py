import httpx
from fastapi import APIRouter, HTTPException, Request
from models import Accounts
from database import Session
from schemas import SignupRequest, LoginRequest, SetupRequest, RequestPasswordReset, ResetPassword
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


@authentication_router.post("/request-password-reset")
async def request_password_reset(payload: RequestPasswordReset, request: Request):
    """
    Sends a reset email to the user via Neon Auth / Better Auth.
    """
    base = os.getenv("NEON_BASE_AUTH")
    if not base:
        raise HTTPException(status_code=500, detail="NEON_BASE_AUTH is not set")

    url = f"{base}/auth/request-password-reset"
    origin = request.headers.get("origin") or os.getenv("FRONTEND_ORIGIN")
    if not origin:
        raise HTTPException(status_code=400, detail="Missing Origin/FRONTEND_ORIGIN")

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            url,
            json={
                "email": payload.email,
                "redirectTo": payload.redirectTo,   # IMPORTANT
            },
            headers={"Origin": origin},
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()


@authentication_router.post("/reset-password")
async def reset_password(payload: ResetPassword):
    """
    Resets password using the token provided in the email link.
    """
    base = os.getenv("NEON_BASE_AUTH")
    if not base:
        raise HTTPException(status_code=500, detail="NEON_BASE_AUTH is not set")

    url = f"{base}/auth/reset-password"

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, json=payload.model_dump())
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()