from fastapi import APIRouter, Depends, Header, Request
from app.db import log_login

router = APIRouter(prefix="/activity", tags=["activity"])

from app.routers.portfolio import get_user_email

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

from pydantic import BaseModel
import os
import jwt
from datetime import datetime, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException

class GoogleLoginRequest(BaseModel):
    id_token: str

@router.post("/auth/google")
async def google_auth(request: GoogleLoginRequest):
    """Verify Google ID token and return a JWT"""
    try:
        # Since we use Expo AuthSession, it might be multiple client IDs
        # We don't strictly enforce a single audience here to make it easier for dev
        id_info = id_token.verify_oauth2_token(
            request.id_token, google_requests.Request()
        )
        
        email = id_info.get("email")
        name = id_info.get("name", "Unknown")
        picture = id_info.get("picture", "")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in token")

        # Check access just like web
        from app.db import get_user_status, set_user_status, update_user_info
        status = get_user_status(email)
        
        if not status:
            set_user_status(email, "pending", name=name, picture=picture)
            raise HTTPException(status_code=403, detail="Account pending approval")
        elif status == "blacklisted":
            raise HTTPException(status_code=403, detail="Account blacklisted")
        elif status == "approved":
            update_user_info(email, name, picture)
        
        # Issue JWT
        secret = os.getenv("JWT_SECRET", "fallback_secret_123")
        payload = {
            "sub": email,
            "name": name,
            "exp": datetime.utcnow() + timedelta(days=30)
        }
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        return {"access_token": token, "token_type": "bearer", "email": email, "name": name}
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
