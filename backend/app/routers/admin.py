from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import FileResponse
import os
import sqlite3
from app.db import get_recent_logins, get_recent_uploads, get_stats, DB_PATH

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
