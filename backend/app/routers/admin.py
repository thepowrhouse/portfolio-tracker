from fastapi import APIRouter, Header, HTTPException, Query, Depends
from fastapi.responses import FileResponse
import os
import sqlite3
from pydantic import BaseModel
from app.db import get_recent_logins, get_recent_uploads, get_stats, DB_PATH

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

@router.get("/access")
async def get_access_list(x_admin_password: str = Depends(verify_admin)):
    """Get all user access records."""
    from app.db import get_all_user_access
    return get_all_user_access()

class UserAccessUpdate(BaseModel):
    email: str
    status: str

@router.post("/access")
async def update_access(user: UserAccessUpdate, x_admin_password: str = Depends(verify_admin)):
    """Update a user's access status."""
    if user.status not in ["pending", "approved", "blacklisted"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    from app.db import set_user_status
    set_user_status(user.email, user.status)
    return {"message": f"User {user.email} status updated to {user.status}"}

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
