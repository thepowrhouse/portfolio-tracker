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
    
    # Create other_assets table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS other_assets (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            value REAL NOT NULL,
            currency TEXT NOT NULL,
            invested_value REAL,
            investment_date TEXT,
            previous_value REAL,
            last_updated TEXT NOT NULL
        )
    """)
    
    # Create user_holdings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            ticker TEXT NOT NULL,
            company_name TEXT NOT NULL,
            quantity REAL NOT NULL,
            avg_price REAL NOT NULL,
            currency TEXT NOT NULL,
            asset_class TEXT NOT NULL,
            broker TEXT NOT NULL,
            is_order_history BOOLEAN NOT NULL DEFAULT 0,
            last_updated TEXT NOT NULL
        )
    """)
    
    # Create market_data table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_data (
            ticker TEXT PRIMARY KEY,
            current_price REAL,
            previous_close REAL,
            day_change REAL,
            day_change_percent REAL,
            currency TEXT,
            last_updated TEXT NOT NULL
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
        
    try:
        cursor.execute("ALTER TABLE user_holdings ADD COLUMN cashflows TEXT")
    except sqlite3.OperationalError:
        pass
    
    # Try adding new columns to other_assets
    try:
        cursor.execute("ALTER TABLE other_assets ADD COLUMN invested_value REAL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE other_assets ADD COLUMN investment_date TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE other_assets ADD COLUMN previous_value REAL")
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

def get_latest_uploads_per_broker(email: str) -> List[Dict[str, Any]]:
    """Fetch the latest upload for each broker for a user."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT t1.id, t1.email, t1.broker, t1.records_parsed, t1.timestamp, t1.file_path, t1.session_id
        FROM user_uploads t1
        JOIN (
            SELECT broker, MAX(timestamp) as max_ts
            FROM user_uploads
            WHERE email = ?
            GROUP BY broker
        ) t2 ON t1.broker = t2.broker AND t1.timestamp = t2.max_ts
        WHERE t1.email = ?
        """,
        (email, email)
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

# ==================== Other Assets CRUD ====================

def add_other_asset(asset_id: str, email: str, category: str, name: str, value: float, currency: str, invested_value: float = None, investment_date: str = None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO other_assets (id, email, category, name, value, currency, invested_value, investment_date, previous_value, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (asset_id, email, category, name, value, currency, invested_value, investment_date, value, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

def get_other_assets(email: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM other_assets WHERE email = ? ORDER BY last_updated DESC", (email,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_other_asset(asset_id: str, email: str, name: str = None, value: float = None, currency: str = None, invested_value: float = None, investment_date: str = None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get old value for previous_value tracking
    cursor.execute("SELECT value FROM other_assets WHERE id = ? AND email = ?", (asset_id, email))
    row = cursor.fetchone()
    old_value = row[0] if row else None
    
    updates = []
    params = []
    
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if value is not None:
        updates.append("previous_value = ?")
        params.append(old_value)
        updates.append("value = ?")
        params.append(value)
    if currency is not None:
        updates.append("currency = ?")
        params.append(currency)
    if invested_value is not None:
        updates.append("invested_value = ?")
        params.append(invested_value)
    if investment_date is not None:
        updates.append("investment_date = ?")
        params.append(investment_date)
        
    if not updates:
        return
        
    updates.append("last_updated = ?")
    params.append(datetime.utcnow().isoformat())
    
    params.extend([asset_id, email])
    
    query = f"UPDATE other_assets SET {', '.join(updates)} WHERE id = ? AND email = ?"
    cursor.execute(query, tuple(params))
    conn.commit()
    conn.close()

def delete_other_asset(asset_id: str, email: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM other_assets WHERE id = ? AND email = ?", (asset_id, email))
    conn.commit()
    conn.close()

# ==================== User Holdings CRUD ====================

def save_user_holdings(email: str, holdings: List[Any]):
    """Replaces all holdings for a user with the newly reconciled list."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Delete old holdings for this user
    cursor.execute("DELETE FROM user_holdings WHERE email = ?", (email,))
    
    # Insert new ones
    now = datetime.utcnow().isoformat()
    import json
    for h in holdings:
        asset_class_str = h.asset_class.value if hasattr(h.asset_class, 'value') else h.asset_class
        currency = "USD" if asset_class_str in ("us_equity", "US_EQUITY") else "INR"
        
        cfs = getattr(h, 'cashflows', [])
        cfs_json = json.dumps([{"date": cf.date.isoformat() if hasattr(cf.date, 'isoformat') else str(cf.date), "amount": cf.amount} for cf in cfs]) if cfs else None
        
        cursor.execute(
            """
            INSERT INTO user_holdings 
            (email, ticker, company_name, quantity, avg_price, currency, asset_class, broker, is_order_history, cashflows, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (email, h.ticker, h.company_name, h.quantity, h.avg_price, currency, 
             asset_class_str,
             h.broker.value if hasattr(h.broker, 'value') else h.broker,
             getattr(h, 'is_order_history', False), cfs_json, now)
        )
    conn.commit()
    conn.close()

def get_user_holdings(email: str) -> List[Dict[str, Any]]:
    """Get the saved holdings for a user."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_holdings WHERE email = ?", (email,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_unique_tickers() -> List[str]:
    """Get all unique tickers across all users for the background poller."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT ticker FROM user_holdings")
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows]

# ==================== Market Data CRUD ====================

def update_market_data(ticker: str, current_price: float, previous_close: float, currency: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    day_change = current_price - previous_close if previous_close else 0.0
    day_change_percent = (day_change / previous_close) * 100 if previous_close else 0.0
    now = datetime.utcnow().isoformat()
    
    cursor.execute(
        """
        INSERT INTO market_data 
        (ticker, current_price, previous_close, day_change, day_change_percent, currency, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ticker) DO UPDATE SET
            current_price=excluded.current_price,
            previous_close=excluded.previous_close,
            day_change=excluded.day_change,
            day_change_percent=excluded.day_change_percent,
            currency=excluded.currency,
            last_updated=excluded.last_updated
        """,
        (ticker, current_price, previous_close, day_change, day_change_percent, currency, now)
    )
    conn.commit()
    conn.close()

def get_market_data(tickers: List[str]) -> Dict[str, Dict[str, Any]]:
    if not tickers:
        return {}
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    placeholders = ",".join("?" * len(tickers))
    cursor.execute(f"SELECT * FROM market_data WHERE ticker IN ({placeholders})", tuple(tickers))
    rows = cursor.fetchall()
    conn.close()
    
    return {row["ticker"]: dict(row) for row in rows}
