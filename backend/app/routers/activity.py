from fastapi import APIRouter, Depends, Header, Request
from app.db import log_login

router = APIRouter(prefix="/activity", tags=["activity"])

def get_user_email(x_user_email: str = Header(default="anonymous")) -> str:
    return x_user_email

def get_session_id(x_session_id: str = Header(default=None)) -> str:
    return x_session_id

@router.post("/login")
async def login_activity(request: Request, email: str = Depends(get_user_email), session_id: str = Depends(get_session_id)):
    ip_address = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    if email != "anonymous":
        log_login(email, session_id, ip_address)
    return {"status": "logged"}
