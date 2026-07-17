from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
from app.models import PortfolioState, PortfolioHolding, CSVHolding, BrokerType, AssetClass
from app.services.csv_parser import parse_csv_by_broker, CSVParseError
from app.services.reconciler import reconcile_portfolio
from app.services.technical import get_technical_analysis
from app.services.fundamental import get_fundamental_analysis
from app.services.sentiment import analyze_sentiment
from app.services.recommender import generate_recommendation
import httpx
from datetime import datetime

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# In-memory store for demo (use PostgreSQL in production)
_portfolio_db: List[PortfolioHolding] = []
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

def enrich_holdings(holdings: List[PortfolioHolding]) -> List[PortfolioHolding]:
    """Fetch current prices and compute P&L in parallel."""
    import concurrent.futures

    def enrich_single(h: PortfolioHolding):
        try:
            import yfinance as yf
            yf_ticker = f"{h.ticker}.NS" if h.asset_class == "indian_equity" else h.ticker
            stock = yf.Ticker(yf_ticker)
            info = stock.info
            price = info.get("currentPrice") or info.get("regularMarketPrice") or h.avg_price
            
            # Update company name if unknown (defaults to ticker)
            if h.company_name == h.ticker:
                fetched_name = info.get("longName") or info.get("shortName")
                if fetched_name:
                    h.company_name = fetched_name
                    
            current_price = price
            
            h.current_price = round(current_price, 2)
            h.pnl_absolute = round((current_price - h.avg_price) * h.quantity, 2)
            h.pnl_percent = round((current_price - h.avg_price) / h.avg_price * 100, 2) if h.avg_price > 0 else 0
            
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
        return h

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        list(executor.map(enrich_single, holdings))
        
    return holdings

@router.get("/state", response_model=PortfolioState)
async def get_portfolio_state():
    global _portfolio_db
    rate = await get_forex_rate()
    enriched = enrich_holdings(_portfolio_db)
    
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

@router.post("/sync")
async def sync_portfolio(
    broker: BrokerType,
    file: UploadFile = File(...)
):
    """
    CRITICAL ENDPOINT: CSV Upload + Reconciliation.
    1. Parse CSV by broker format
    2. Reconcile with current state (delete missing, add new, update qty)
    3. Return new state
    """
    global _portfolio_db
    
    if broker == BrokerType.RSU:
        raise HTTPException(400, "RSU entries use manual POST, not CSV upload")
    
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

        new_holdings = reconcile_portfolio(_portfolio_db, csv_holdings, broker)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
        
    _portfolio_db.clear()
    _portfolio_db.extend(new_holdings)
    
    # Enrich with prices
    enriched = enrich_holdings(_portfolio_db)
    
    return {
        "message": f"Synced {len(csv_holdings)} holdings from {broker.value}",
        "added": len([h for h in csv_holdings if not any(
            existing.ticker == h.ticker and existing.broker == h.broker 
            for existing in _portfolio_db
        )]),
        "updated": len([h for h in csv_holdings if any(
            existing.ticker == h.ticker and existing.broker == h.broker 
            for existing in _portfolio_db
        )]),
        "deleted": len(_portfolio_db) - len(csv_holdings) if len(_portfolio_db) > len(csv_holdings) else 0,
        "holdings": enriched
    }

@router.post("/manual")
async def add_manual_holding(holding: CSVHolding):
    """For RSU or manual entries."""
    global _portfolio_db
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
    _portfolio_db.append(new_h)
    return new_h

@router.delete("/{holding_id}")
async def delete_holding(holding_id: str):
    global _portfolio_db
    _portfolio_db[:] = [h for h in _portfolio_db if h.id != holding_id]
    return {"message": "Deleted"}

@router.post("/reset")
async def reset_portfolio():
    global _portfolio_db
    _portfolio_db.clear()
    return {"message": "Portfolio reset successfully"}