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

from typing import Optional

@router.get("/check-access")
async def check_access(email: str, name: Optional[str] = None, picture: Optional[str] = None):
    """Check if a user is approved, pending, or blacklisted."""
    from app.db import get_user_status, set_user_status, update_user_info
    
    status = get_user_status(email)
    
    # If this is a brand new user, put them in 'approved' status automatically
    if not status:
        set_user_status(email, "pending", name=name, picture=picture)
        status = "pending"
    else:
        # Update name and picture if provided and user already exists
        update_user_info(email, name, picture)
    
    if status == "blacklisted":
        return {"has_access": False, "reason": "blacklisted"}
    elif status == "pending":
        return {"has_access": False, "reason": "pending"}
    elif status == "approved":
        return {"has_access": True}
        
    return {"has_access": False, "reason": "unknown"}
