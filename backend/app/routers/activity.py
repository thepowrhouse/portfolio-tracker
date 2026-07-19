from fastapi import APIRouter, Depends, Header
from app.db import log_login

router = APIRouter(prefix="/activity", tags=["activity"])

def get_user_email(x_user_email: str = Header(default="anonymous")) -> str:
    return x_user_email

@router.post("/login")
async def record_login(email: str = Depends(get_user_email)):
    if email and email != "anonymous":
        log_login(email)
    return {"status": "logged"}
