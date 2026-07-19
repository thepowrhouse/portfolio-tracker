from fastapi import APIRouter, Depends, Header, Request
from app.db import log_login, is_blacklisted

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

@router.get("/check-blacklist")
async def check_blacklist(email: str):
    """Check if a user is explicitly blacklisted."""
    from app.db import is_blacklisted
    return {"is_blacklisted": is_blacklisted(email)}

@router.get("/check-access")
async def check_access(email: str):
    """Check if a user is approved and not blacklisted."""
    from app.db import is_blacklisted, is_approved
    
    if is_blacklisted(email):
        return {"has_access": False, "reason": "blacklisted"}
    
    if not is_approved(email):
        return {"has_access": False, "reason": "not_approved"}
        
    return {"has_access": True}
