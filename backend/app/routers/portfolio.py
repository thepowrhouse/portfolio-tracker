from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Header
from typing import List, Dict
from collections import defaultdict
from app.models import PortfolioState, PortfolioHolding, CSVHolding, BrokerType, AssetClass
from app.services.csv_parser import parse_csv_by_broker, CSVParseError
from app.services.reconciler import reconcile_portfolio
from app.services.technical import get_technical_analysis
from app.services.fundamental import get_fundamental_analysis
from app.services.sentiment import analyze_sentiment
from app.services.recommender import generate_recommendation
from app.db import log_upload, get_user_status
import httpx
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from app.models import PortfolioQuantMetrics
from app.services.quant import get_quant_metrics

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

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
    
    # 1. Collect unique tickers to fetch in bulk
    tickers_to_fetch = set()
    for h in holdings:
        yf_ticker = h.ticker
        if h.asset_class == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"
        tickers_to_fetch.add(yf_ticker)
        
    tickers_list = list(tickers_to_fetch)
    price_map = {}
    prev_map = {}
    
    if tickers_list:
        try:
            # yf.download handles rate limits much better for bulk fetching
            hist = yf.download(tickers_list, period="5d", progress=False)["Close"]
            if len(tickers_list) == 1:
                if not hist.empty:
                    price_map[tickers_list[0]] = float(hist.iloc[-1])
                    if len(hist) > 1:
                        prev_map[tickers_list[0]] = float(hist.iloc[-2])
            else:
                if not hist.empty:
                    last_row = hist.iloc[-1]
                    prev_row = hist.iloc[-2] if len(hist) > 1 else None
                    for t in tickers_list:
                        if t in last_row and not pd.isna(last_row[t]):
                            price_map[t] = float(last_row[t])
                        if prev_row is not None and t in prev_row and not pd.isna(prev_row[t]):
                            prev_map[t] = float(prev_row[t])
        except Exception as e:
            print(f"Batch fetch error: {e}")

    # 2. Assign prices and calculate metrics
    for h in holdings:
        try:
            yf_ticker = h.ticker
            if h.asset_class == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
                yf_ticker += ".NS"
            
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
                from datetime import datetime
                
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
async def get_portfolio_state(email: str = Depends(verify_access)):
    global _portfolio_db
    user_portfolio = _portfolio_db[email]
    rate = await get_forex_rate()
    enriched = enrich_holdings(user_portfolio)
    
    net_worth = 0
    for h in enriched:
        val = (h.current_price or h.avg_price) * h.quantity
        if h.asset_class in (AssetClass.US_EQUITY, "us_equity", "US_EQUITY"):
            val *= _usd_to_inr
        net_worth += val
    
    return PortfolioState(
        holdings=enriched,
        net_worth_inr=round(net_worth, 2),
        net_worth_usd=round(net_worth / rate, 2),
        last_sync=datetime.utcnow(),
        usd_to_inr=rate
    )

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
    
    # Enrich with prices
    enriched = enrich_holdings(user_portfolio)
    
    # Log the upload activity and save file
    if email and email != "anonymous":
        filename = f"{int(datetime.utcnow().timestamp())}_{broker.value}_{email}.csv"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        log_upload(email, broker.value, len(csv_holdings), file_path, session_id)
        
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
    return new_h

@router.delete("/{holding_id}")
async def delete_holding(holding_id: str, email: str = Depends(verify_access)):
    global _portfolio_db
    user_portfolio = _portfolio_db[email]
    _portfolio_db[email] = [h for h in user_portfolio if h.id != holding_id]
    return {"message": "Deleted"}

@router.post("/reset")
async def reset_portfolio(email: str = Depends(verify_access)):
    global _portfolio_db
    _portfolio_db[email].clear()
    return {"message": "Portfolio reset successfully"}