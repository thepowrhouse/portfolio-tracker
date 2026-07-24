from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from typing import List, Dict
from collections import defaultdict
from app.models import PortfolioState, PortfolioHolding, CSVHolding, BrokerType, AssetClass, OtherAsset, OtherAssetCreate, OtherAssetUpdate
from app.services.csv_parser import parse_csv_by_broker, CSVParseError
from app.services.reconciler import reconcile_portfolio
from app.services.technical import get_technical_analysis
from app.services.fundamental import get_fundamental_analysis
from app.services.sentiment import analyze_sentiment
from app.services.recommender import generate_recommendation
from app.db import log_upload, get_user_status, add_other_asset, get_other_assets, update_other_asset, delete_other_asset
import httpx
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from app.models import PortfolioQuantMetrics
from app.services.quant import get_quant_metrics
import time

_portfolio_cache = {}
CACHE_TTL = 1800 # 30 minutes

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/debug")
def debug_info():
    import sqlite3
    from app.db import DB_PATH
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    uploads = [dict(r) for r in c.execute("SELECT * FROM user_uploads ORDER BY timestamp DESC LIMIT 5").fetchall()]
    return {
        "db_keys": list(_portfolio_db.keys()),
        "db_lens": {k: len(v) for k, v in _portfolio_db.items()},
        "uploads": uploads
    }


# In-memory store for demo (use PostgreSQL in production)
_portfolio_db: Dict[str, List[PortfolioHolding]] = defaultdict(list)
_usd_to_inr: float = 83.5

async def get_forex_rate() -> float:
    """Fetch live USD/INR rate."""
    global _usd_to_inr
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.exchangerate-api.com/v4/latest/USD",
                timeout=10.0
            )
            data = resp.json()
            _usd_to_inr = data["rates"]["INR"]
    except Exception:
        pass
    return _usd_to_inr

def get_user_email(x_user_email: str = Header(default="anonymous")) -> str:
    return x_user_email

def verify_access(email: str = Depends(get_user_email)) -> str:
    if not email or email == "anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    status = get_user_status(email)
    if status == "blacklisted":
        raise HTTPException(status_code=403, detail="Account is blacklisted")
    if status != "approved":
        raise HTTPException(status_code=403, detail="Account is not approved")
    return email

def get_session_id(x_session_id: str = Header(default=None)) -> str:
    return x_session_id

def enrich_holdings(holdings: List[PortfolioHolding]) -> List[PortfolioHolding]:
    """Fetch current prices and compute P&L in parallel."""
    if not holdings:
        return []

    import yfinance as yf
    import pandas as pd
    import requests
    import concurrent.futures
    
    def fetch_name(ticker):
        try:
            url = f"https://query2.finance.yahoo.com/v1/finance/search?q={ticker}"
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=3)
            if r.status_code == 200:
                quotes = r.json().get('quotes', [])
                if quotes:
                    return quotes[0].get('longname') or quotes[0].get('shortname') or ticker
        except:
            pass
        return ticker
    
    # 1. Collect unique tickers to fetch in bulk
    tickers_to_fetch = set()
    tickers_needing_names = set()
    for h in holdings:
        yf_ticker = h.ticker
        if h.asset_class == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"
        tickers_to_fetch.add(yf_ticker)
        
        if h.company_name == h.ticker:
            tickers_needing_names.add(yf_ticker)
            
    name_map = {}
    if tickers_needing_names:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            results = list(executor.map(fetch_name, tickers_needing_names))
            name_map = dict(zip(tickers_needing_names, results))
        
    tickers_list = list(tickers_to_fetch)
    price_map = {}
    prev_map = {}
    
    if tickers_list:
        try:
            # Use Yahoo Finance bulk quote API for true live prices and previous close
            # This avoids stale '1d' history and rate limits of .info
            # Chunk symbols if there are too many (e.g. > 50)
            chunk_size = 50
            for i in range(0, len(tickers_list), chunk_size):
                chunk = tickers_list[i:i + chunk_size]
                symbols_str = ",".join(chunk)
                url = f"https://query2.finance.yahoo.com/v7/finance/quote?symbols={symbols_str}"
                r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
                if r.status_code == 200:
                    results = r.json().get('quoteResponse', {}).get('result', [])
                    for quote in results:
                        sym = quote.get('symbol')
                        if sym:
                            price_map[sym] = quote.get('regularMarketPrice')
                            prev_map[sym] = quote.get('regularMarketPreviousClose')
        except Exception as e:
            print(f"Batch fetch error: {e}")

    # 2. Assign prices and calculate metrics
    for h in holdings:
        try:
            yf_ticker = h.ticker
            if h.asset_class == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
                yf_ticker += ".NS"
                
            if h.company_name == h.ticker:
                fetched_name = name_map.get(yf_ticker)
                if fetched_name and fetched_name != yf_ticker:
                    h.company_name = fetched_name
            
            # Fetch from map, or fallback to avg_price if yfinance fails
            current_price = price_map.get(yf_ticker)
            
            if not current_price:
                # Rare fallback: maybe the stock was delisted or yfinance batch failed
                try:
                    stock = yf.Ticker(yf_ticker)
                    info = stock.info
                    current_price = info.get("currentPrice") or info.get("regularMarketPrice") or h.avg_price
                    prev_close = info.get("previousClose")
                except Exception:
                    current_price = h.avg_price
                    prev_close = None
            else:
                prev_close = prev_map.get(yf_ticker)
            
            h.current_price = round(current_price, 2)
            h.pnl_absolute = round((current_price - h.avg_price) * h.quantity, 2)
            h.pnl_percent = round((current_price - h.avg_price) / h.avg_price * 100, 2) if h.avg_price > 0 else 0
            
            if prev_close and prev_close > 0:
                h.day_change_absolute = round((current_price - prev_close) * h.quantity, 2)
                h.day_change_percent = round((current_price - prev_close) / prev_close * 100, 2)
            else:
                h.day_change_absolute = 0.0
                h.day_change_percent = 0.0
            
            # Compute XIRR if cashflows are available
            if getattr(h, 'cashflows', None) and len(h.cashflows) > 0 and h.quantity > 0:
                from app.utils.math_utils import calculate_xirr
                
                # Copy cashflows to avoid mutating the original DB record
                cfs = [(cf.date, cf.amount) for cf in h.cashflows]
                
                # Add final cashflow (current portfolio value)
                cfs.append((datetime.utcnow(), h.quantity * current_price))
                
                rate = calculate_xirr(cfs)
                if rate is not None:
                    h.xirr = round(rate * 100, 2)
                    
        except Exception as e:
            print(f"Error enriching {h.ticker}: {e}")
            h.current_price = h.avg_price
            h.pnl_absolute = 0
            h.pnl_percent = 0
            h.day_change_absolute = 0
            h.day_change_percent = 0
            
    return holdings

@router.get("/state", response_model=PortfolioState)
async def get_portfolio_state(force: bool = False, email: str = Depends(verify_access)):
    """Get the current state of the portfolio including real-time prices."""
    global _usd_to_inr
    
    # Check cache
    if not force and email in _portfolio_cache:
        cached_data, timestamp = _portfolio_cache[email]
        if time.time() - timestamp < CACHE_TTL:
            return cached_data
    
    # 1. Get uploaded holdings
    uploaded_holdings = _portfolio_db.get(email, [])
    print(f"GET STATE DEBUG: email={email}, len(uploaded_holdings) from DB={len(uploaded_holdings)}")
    
    if not uploaded_holdings:
        import os
        import sqlite3
        from app.db import DB_PATH
        from app.services.csv_parser import parse_csv_by_broker
        from app.models import BrokerType
        from app.services.reconciler import reconcile_portfolio

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT broker, file_path FROM user_uploads WHERE email = ? ORDER BY timestamp DESC", (email,))
        rows = cursor.fetchall()
        conn.close()

        latest_snapshot = {}
        latest_tradebook = {}

        for row in rows:
            broker_str = row["broker"]
            file_path = row["file_path"]
            
            # Stop parsing for a broker if we already have both its snapshot and tradebook
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
                        latest_snapshot[broker_str] = csv_holdings
                except Exception as e:
                    print(f"Failed to parse cached file for {broker_str}: {e}")

        restored_holdings = []
        
        # Step 1: Apply all Holdings Snapshots first
        for broker_str, csv_holdings in latest_snapshot.items():
            try:
                broker_enum = BrokerType(broker_str)
                restored_holdings = reconcile_portfolio(restored_holdings, csv_holdings, broker_enum)
            except Exception as e:
                print(f"Failed to restore snapshot for {broker_str}: {e}")
                
        # Step 2: Apply all Order History / Tradebooks to update cashflows
        for broker_str, csv_holdings in latest_tradebook.items():
            try:
                broker_enum = BrokerType(broker_str)
                restored_holdings = reconcile_portfolio(restored_holdings, csv_holdings, broker_enum)
            except Exception as e:
                print(f"Failed to restore tradebook for {broker_str}: {e}")

        if restored_holdings:
            _portfolio_db[email] = restored_holdings
            uploaded_holdings = restored_holdings
                
    rate = await get_forex_rate()
    enriched = enrich_holdings(uploaded_holdings)
    
    net_worth = 0
    for h in enriched:
        val = (h.current_price or h.avg_price) * h.quantity
        if h.asset_class in (AssetClass.US_EQUITY, "us_equity", "US_EQUITY"):
            val *= _usd_to_inr
        net_worth += val
        
    other_assets_data = get_other_assets(email)
    other_assets = []
    for asset_dict in other_assets_data:
        asset = OtherAsset(**asset_dict)
        
        if asset.invested_value is not None and asset.invested_value > 0:
            asset.pnl_absolute = asset.value - asset.invested_value
            asset.pnl_percent = (asset.pnl_absolute / asset.invested_value) * 100
                
        if asset.invested_value is not None and asset.investment_date is not None and asset.invested_value > 0:
            try:
                from app.utils.math_utils import calculate_xirr
                inv_date = datetime.fromisoformat(asset.investment_date)
                cfs = [
                    (inv_date, -asset.invested_value),
                    (datetime.utcnow(), asset.value)
                ]
                xirr_rate = calculate_xirr(cfs)
                if xirr_rate is not None:
                    asset.xirr = round(xirr_rate * 100, 2)
            except Exception as e:
                print(f"Error calculating XIRR for {asset.name}: {e}")
                
        other_assets.append(asset)
        val = asset.value
        if asset.currency == "USD":
            val *= rate
        net_worth += val
    
    state = PortfolioState(
        holdings=enriched,
        other_assets=other_assets,
        net_worth_inr=round(net_worth, 2),
        net_worth_usd=round(net_worth / rate, 2),
        last_sync=datetime.utcnow(),
        usd_to_inr=rate
    )
    _portfolio_cache[email] = (state, time.time())
    return state

@router.get("/quant", response_model=PortfolioQuantMetrics)
async def get_portfolio_quant(email: str = Depends(verify_access)):
    """Calculate portfolio-level weighted risk metrics (Alpha, Beta, Sharpe, Sortino)."""
    global _portfolio_db
    user_portfolio = _portfolio_db[email]
    
    if not user_portfolio:
        return PortfolioQuantMetrics(
            portfolio_beta=1.0,
            portfolio_alpha=0.0,
            portfolio_sharpe=0.0,
            portfolio_sortino=0.0,
            holdings_analyzed=0
        )
        
    rate = await get_forex_rate()
    
    # Need current prices to calculate weights
    enriched = enrich_holdings(user_portfolio)
    
    # Filter out holdings with 0 value
    valid_holdings = [h for h in enriched if h.quantity > 0 and h.current_price and h.current_price > 0]
    
    if not valid_holdings:
        return PortfolioQuantMetrics(
            portfolio_beta=1.0,
            portfolio_alpha=0.0,
            portfolio_sharpe=0.0,
            portfolio_sortino=0.0,
            holdings_analyzed=0
        )
        
    total_value_inr = 0
    weights = []
    
    for h in valid_holdings:
        val = h.current_price * h.quantity
        if h.asset_class in (AssetClass.US_EQUITY, "us_equity", "US_EQUITY"):
            val *= rate
        weights.append((h, val))
        total_value_inr += val
        
    loop = asyncio.get_event_loop()
    
    def fetch_quant(holding):
        return get_quant_metrics(holding.ticker, holding.asset_class)
        
    with ThreadPoolExecutor(max_workers=10) as executor:
        tasks = [
            loop.run_in_executor(executor, fetch_quant, h)
            for h, _ in weights
        ]
        metrics_results = await asyncio.gather(*tasks)
        
    # Calculate weighted averages
    weighted_beta = 0
    weighted_alpha = 0
    weighted_sharpe = 0
    weighted_sortino = 0
    
    for i, (holding, val) in enumerate(weights):
        weight = val / total_value_inr if total_value_inr > 0 else 0
        m = metrics_results[i]
        weighted_beta += (m.beta * weight)
        weighted_alpha += (m.alpha * weight)
        weighted_sharpe += (m.sharpe_ratio * weight)
        weighted_sortino += (m.sortino_ratio * weight)
        
    return PortfolioQuantMetrics(
        portfolio_beta=round(weighted_beta, 2),
        portfolio_alpha=round(weighted_alpha, 4),
        portfolio_sharpe=round(weighted_sharpe, 2),
        portfolio_sortino=round(weighted_sortino, 2),
        holdings_analyzed=len(weights)
    )

@router.post("/sync")
async def sync_portfolio(
    broker: BrokerType,
    file: UploadFile = File(...),
    email: str = Depends(verify_access),
    session_id: str = Depends(get_session_id)
):
    """
    CRITICAL ENDPOINT: CSV Upload + Reconciliation.
    1. Parse CSV by broker format
    2. Reconcile with current state (delete missing, add new, update qty)
    3. Return new state
    """
    global _portfolio_db
    user_portfolio = _portfolio_db[email]
    
    contents = await file.read()
    
    try:
        csv_holdings = parse_csv_by_broker(contents, broker)
    except CSVParseError as e:
        raise HTTPException(400, detail=str(e))
    
    # Reconcile
    try:
        # Before reconciling, ensure INDmoney US Equity snapshot values are converted to USD
        # since the snapshot CSV has them in INR, but we want to store native USD internally
        for h in csv_holdings:
            if h.broker == BrokerType.INDMONEY and h.asset_class in (AssetClass.US_EQUITY, "us_equity", "US_EQUITY") and not getattr(h, 'is_order_history', False):
                if _usd_to_inr > 0:
                    h.avg_price = round(h.avg_price / _usd_to_inr, 4)

        new_holdings = reconcile_portfolio(user_portfolio, csv_holdings, broker)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
        
    user_portfolio.clear()
    user_portfolio.extend(new_holdings)
    
    print(f"SYNC DEBUG: parsed {len(csv_holdings)} from CSV. New holdings total: {len(new_holdings)}. user_portfolio len: {len(user_portfolio)}")
    
    # Enrich with prices
    enriched = enrich_holdings(user_portfolio)
    
    # Log the upload activity and save file
    if email and email != "anonymous":
        filename = f"{int(datetime.utcnow().timestamp())}_{broker.value}_{email}.csv"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        log_upload(email, broker.value, len(csv_holdings), file_path, session_id)
        
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return {
        "message": f"Synced {len(csv_holdings)} holdings from {broker.value}",
        "added": len([h for h in csv_holdings if not any(
            existing.ticker == h.ticker and existing.broker == h.broker 
            for existing in user_portfolio
        )]),
        "updated": len([h for h in csv_holdings if any(
            existing.ticker == h.ticker and existing.broker == h.broker 
            for existing in user_portfolio
        )]),
        "deleted": len(user_portfolio) - len(csv_holdings) if len(user_portfolio) > len(csv_holdings) else 0,
        "holdings": enriched
    }

@router.post("/manual")
async def add_manual_holding(holding: CSVHolding, email: str = Depends(verify_access)):
    """For RSU or manual entries."""
    global _portfolio_db
    user_portfolio = _portfolio_db[email]
    from uuid import uuid4
    new_h = PortfolioHolding(
        id=str(uuid4()),
        ticker=holding.ticker,
        company_name=holding.company_name,
        quantity=holding.quantity,
        avg_price=holding.avg_price,
        broker=holding.broker,
        asset_class=holding.asset_class
    )
    user_portfolio.append(new_h)
    
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return new_h

@router.delete("/{holding_id}")
async def delete_holding(holding_id: str, email: str = Depends(verify_access)):
    global _portfolio_db
    user_portfolio = _portfolio_db[email]
    _portfolio_db[email] = [h for h in user_portfolio if h.id != holding_id]
    
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return {"message": "Deleted"}

@router.post("/reset")
async def reset_portfolio(email: str = Depends(verify_access)):
    global _portfolio_db
    _portfolio_db[email].clear()
    
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return {"message": "Portfolio reset successfully"}

@router.post("/other-assets", response_model=OtherAsset)
async def create_other_asset(asset: OtherAssetCreate, email: str = Depends(verify_access)):
    from uuid import uuid4
    asset_id = str(uuid4())
    add_other_asset(asset_id, email, asset.category.value, asset.name, asset.value, asset.currency, asset.invested_value, asset.investment_date)
    
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return OtherAsset(
        id=asset_id,
        email=email,
        category=asset.category,
        name=asset.name,
        value=asset.value,
        currency=asset.currency,
        invested_value=asset.invested_value,
        investment_date=asset.investment_date,
        previous_value=asset.value,
        last_updated=datetime.utcnow()
    )

@router.put("/other-assets/{asset_id}", response_model=dict)
async def modify_other_asset(asset_id: str, asset: OtherAssetUpdate, email: str = Depends(verify_access)):
    update_other_asset(asset_id, email, asset.name, asset.value, asset.currency, asset.invested_value, asset.investment_date)
    
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return {"message": "Asset updated successfully"}

@router.delete("/other-assets/{asset_id}")
async def remove_other_asset(asset_id: str, email: str = Depends(verify_access)):
    delete_other_asset(asset_id, email)
    
    if email in _portfolio_cache:
        del _portfolio_cache[email]
        
    return {"message": "Asset deleted successfully"}

@router.get("/debug/state")
async def debug_state(email: str = Depends(verify_access)):
    import os
    uploads = []
    if os.path.exists(UPLOAD_DIR):
        uploads = os.listdir(UPLOAD_DIR)
    
    # Also fetch rows from sqlite
    import sqlite3
    from app.db import DB_PATH
    db_rows = []
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT broker, file_path, timestamp FROM user_uploads WHERE email = ? ORDER BY timestamp DESC", (email,))
        db_rows = [dict(r) for r in c.fetchall()]
        conn.close()
    except Exception as e:
        db_rows = [{"error": str(e)}]
        
    return {
        "email": email,
        "portfolio_db_len": len(_portfolio_db.get(email, [])),
        "portfolio_db": _portfolio_db.get(email, []),
        "cache_keys": list(_portfolio_cache.keys()),
        "uploads_dir": uploads,
        "db_rows": db_rows
    }