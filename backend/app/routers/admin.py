from fastapi import APIRouter, Header, HTTPException, Query, Depends
from fastapi.responses import FileResponse
import os
import sqlite3
from pydantic import BaseModel
from app.db import get_recent_logins, get_recent_uploads, get_stats, DB_PATH, blacklist_user, remove_blacklisted_user, get_blacklisted_users

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_SECRET = os.getenv("ADMIN_PASSWORD", "secret123")

def verify_admin(x_admin_password: str = Header(None)):
    admin_password = os.getenv("ADMIN_PASSWORD", "secret123")
    if not admin_password or x_admin_password != admin_password:
        raise HTTPException(status_code=403, detail="Not authorized")
    return True

class BlacklistRequest(BaseModel):
    email: str
    reason: str = None

@router.get("/dashboard", dependencies=[Depends(verify_admin)])
async def get_dashboard_data():
    """Get all admin dashboard data."""
    return {
        "stats": get_stats(),
        "recent_logins": get_recent_logins(100),
        "recent_uploads": get_recent_uploads(100)
    }

@router.get("/blacklist", dependencies=[Depends(verify_admin)])
async def get_blacklist():
    """Get all blacklisted users."""
    return get_blacklisted_users()

@router.post("/blacklist", dependencies=[Depends(verify_admin)])
async def add_to_blacklist(req: BlacklistRequest):
    """Add a user to the blacklist."""
    blacklist_user(req.email, req.reason)
    return {"status": "success", "message": f"{req.email} has been blacklisted"}

@router.delete("/blacklist/{email}", dependencies=[Depends(verify_admin)])
async def remove_from_blacklist(email: str):
    """Remove a user from the blacklist."""
    remove_blacklisted_user(email)
    return {"status": "success", "message": f"{email} has been removed from blacklist"}

@router.get("/approved")
async def get_approved(x_admin_password: str = Depends(verify_admin)):
    """Get list of all approved users."""
    from app.db import get_approved_users
    return get_approved_users()

class ApprovedUserCreate(BaseModel):
    email: str

@router.post("/approved")
async def add_approved(user: ApprovedUserCreate, x_admin_password: str = Depends(verify_admin)):
    """Approve a user."""
    from app.db import approve_user
    approve_user(user.email)
    return {"message": "User approved successfully"}

@router.delete("/approved/{email}")
async def remove_approved(email: str, x_admin_password: str = Depends(verify_admin)):
    """Remove a user from approved list."""
    from app.db import remove_approved_user
    remove_approved_user(email)
    return {"message": "User removed from approved list"}

@router.get("/download/{upload_id}")
async def download_upload(upload_id: int, token: str = Query(None)):
    verify_admin(token)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM user_uploads WHERE id = ?", (upload_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="File not found")
        
    file_path = row[0]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File no longer exists on disk")
        
    filename = os.path.basename(file_path)
    return FileResponse(path=file_path, filename=filename, media_type='text/csv')
