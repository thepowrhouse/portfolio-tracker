import os
import sqlite3
import sys

# Add the backend directory to python path so imports work
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db import DB_PATH, save_user_holdings
from app.services.csv_parser import parse_csv_by_broker
from app.models import BrokerType, AssetClass
from app.services.reconciler import reconcile_portfolio

def run_migration():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all unique users who have uploads
    cursor.execute("SELECT DISTINCT email FROM user_uploads")
    users = [r[0] for r in cursor.fetchall()]
    
    for email in users:
        print(f"Migrating for {email}...")
        
        # Get latest uploads
        cursor.execute("SELECT broker, file_path FROM user_uploads WHERE email = ? ORDER BY timestamp DESC", (email,))
        rows = cursor.fetchall()
        
        latest_snapshot = {}
        latest_tradebook = {}

        for row in rows:
            broker_str = row["broker"]
            file_path = row["file_path"]
            
            if broker_str in latest_snapshot and broker_str in latest_tradebook:
                continue

            if file_path and os.path.exists(file_path):
                try:
                    with open(file_path, "rb") as f:
                        contents = f.read()
                    broker_enum = BrokerType(broker_str)
                    csv_holdings = parse_csv_by_broker(contents, broker_enum)
                    
                    if not csv_holdings:
                        continue
                        
                    is_history = getattr(csv_holdings[0], 'is_order_history', False)
                    
                    if is_history and broker_str not in latest_tradebook:
                        latest_tradebook[broker_str] = csv_holdings
                    elif not is_history and broker_str not in latest_snapshot:
                        usd_to_inr = 83.50 
                        for h in csv_holdings:
                            if h.broker == BrokerType.INDMONEY and h.asset_class in (AssetClass.US_EQUITY, "us_equity", "US_EQUITY"):
                                h.avg_price = round(h.avg_price / usd_to_inr, 4)
                        latest_snapshot[broker_str] = csv_holdings
                except Exception as e:
                    print(f"Failed to parse cached file for {broker_str}: {e}")

        restored_holdings = []
        
        for broker_str, csv_holdings in latest_snapshot.items():
            broker_enum = BrokerType(broker_str)
            restored_holdings = reconcile_portfolio(restored_holdings, csv_holdings, broker_enum)
                
        for broker_str, csv_holdings in latest_tradebook.items():
            broker_enum = BrokerType(broker_str)
            restored_holdings = reconcile_portfolio(restored_holdings, csv_holdings, broker_enum)
            
        print(f"Saving {len(restored_holdings)} holdings for {email}")
        save_user_holdings(email, restored_holdings)
        
    conn.close()
    print("Migration complete!")
    
if __name__ == "__main__":
    run_migration()
