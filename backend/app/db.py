import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "activity.db"))

def init_db():
    """Initializes the SQLite database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create logins table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_logins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            session_id TEXT,
            ip_address TEXT
        )
    """)
    
    # Create uploads table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            broker TEXT NOT NULL,
            records_parsed INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            file_path TEXT,
            session_id TEXT
        )
    """)
    
    # Create unified user_access table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_access (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL, -- 'pending', 'approved', 'blacklisted'
            timestamp TEXT NOT NULL,
            name TEXT,
            picture TEXT
        )
    """)
    
    try:
        cursor.execute("ALTER TABLE user_access ADD COLUMN name TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_access ADD COLUMN picture TEXT")
    except sqlite3.OperationalError:
        pass
    
    # Try adding new columns to existing tables
    try:
        cursor.execute("ALTER TABLE user_uploads ADD COLUMN file_path TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_uploads ADD COLUMN session_id TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_logins ADD COLUMN session_id TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE user_logins ADD COLUMN ip_address TEXT")
    except sqlite3.OperationalError:
        pass
    
    conn.commit()
    conn.close()

def log_login(email: str, session_id: str = None, ip_address: str = None):
    """Log a user login event."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO user_logins (email, timestamp, session_id, ip_address) VALUES (?, ?, ?, ?)",
        (email, datetime.utcnow().isoformat(), session_id, ip_address)
    )
    conn.commit()
    conn.close()

def log_upload(email: str, broker: str, records_parsed: int, file_path: str = None, session_id: str = None):
    """Log a CSV upload event."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO user_uploads (email, broker, records_parsed, timestamp, file_path, session_id) VALUES (?, ?, ?, ?, ?, ?)",
        (email, broker, records_parsed, datetime.utcnow().isoformat(), file_path, session_id)
    )
    conn.commit()
    conn.close()

def get_recent_logins(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch recent logins."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, timestamp, session_id, ip_address FROM user_logins ORDER BY timestamp DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_recent_uploads(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch recent uploads."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, broker, records_parsed, timestamp, file_path, session_id FROM user_uploads ORDER BY timestamp DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_stats() -> Dict[str, Any]:
    """Get overall statistics."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(DISTINCT email) FROM user_logins")
    unique_users = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM user_uploads")
    total_uploads = cursor.fetchone()[0]
    
    conn.close()
    return {
        "unique_users": unique_users,
        "total_uploads": total_uploads
    }

def get_user_status(email: str) -> Optional[str]:
    """Get the access status of a user (pending, approved, blacklisted). Returns None if not found."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM user_access WHERE email = ?", (email,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

def set_user_status(email: str, status: str, name: str = None, picture: str = None):
    """Set or update the status of a user."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO user_access (email, status, timestamp, name, picture) 
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET 
            status=excluded.status, 
            timestamp=excluded.timestamp,
            name=COALESCE(excluded.name, name),
            picture=COALESCE(excluded.picture, picture)
        """,
        (email, status, datetime.utcnow().isoformat(), name, picture)
    )
    conn.commit()
    conn.close()

def update_user_info(email: str, name: str = None, picture: str = None):
    """Update user info without changing status."""
    if not name and not picture:
        return
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE user_access SET name = COALESCE(?, name), picture = COALESCE(?, picture) WHERE email = ?",
        (name, picture, email)
    )
    conn.commit()
    conn.close()

def get_all_user_access() -> List[Dict[str, Any]]:
    """Fetch all user access records."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT email, status, timestamp, name, picture FROM user_access ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
