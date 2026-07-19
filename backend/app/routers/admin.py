from fastapi import APIRouter, Header, HTTPException
import os
from app.db import get_recent_logins, get_recent_uploads, get_stats

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_SECRET = os.getenv("ADMIN_PASSWORD", "secret123")

def verify_admin(x_admin_token: str = Header(None)):
    if not x_admin_token or x_admin_token != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@router.get("/dashboard")
async def get_dashboard_data(x_admin_token: str = Header(None)):
    verify_admin(x_admin_token)
    
    return {
        "stats": get_stats(),
        "recent_logins": get_recent_logins(100),
        "recent_uploads": get_recent_uploads(100)
    }
