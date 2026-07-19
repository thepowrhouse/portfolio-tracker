import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "activity.db")

def init_db():
    """Initializes the SQLite database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create logins table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_logins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    # Create uploads table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            broker TEXT NOT NULL,
            records_parsed INTEGER NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()

def log_login(email: str):
    """Log a user login event."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO user_logins (email, timestamp) VALUES (?, ?)",
        (email, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

def log_upload(email: str, broker: str, records_parsed: int):
    """Log a CSV upload event."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO user_uploads (email, broker, records_parsed, timestamp) VALUES (?, ?, ?, ?)",
        (email, broker, records_parsed, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

def get_recent_logins(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch recent logins."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, timestamp FROM user_logins ORDER BY timestamp DESC LIMIT ?",
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
        "SELECT id, email, broker, records_parsed, timestamp FROM user_uploads ORDER BY timestamp DESC LIMIT ?",
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
