import re
import os

filepath = 'app/routers/portfolio.py'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("from app.db import get_other_assets, add_other_asset, update_other_asset, delete_other_asset", 
                          "from app.db import get_other_assets, add_other_asset, update_other_asset, delete_other_asset, save_user_holdings, get_user_holdings, get_market_data, update_market_data")

# 2. get_portfolio_state
new_state = """@router.get("/state", response_model=PortfolioState)
async def get_portfolio_state(force: bool = False, email: str = Depends(verify_access)):
    \"\"\"Get the current state of the portfolio from the DB cache.\"\"\"
    global _usd_to_inr
    
    # 1. Fetch User Holdings from DB
    from app.db import get_user_holdings, get_market_data, get_other_assets, update_market_data
    from app.models import PortfolioHolding, OtherAsset
    import yfinance as yf
    
    raw_holdings = get_user_holdings(email)
    holdings = []
    tickers_to_fetch = set()
    
    for r in raw_holdings:
        yf_ticker = r['ticker']
        if r['asset_class'] == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"
        tickers_to_fetch.add(yf_ticker)
            
        h = PortfolioHolding(
            ticker=r['ticker'],
            company_name=r['company_name'],
            quantity=r['quantity'],
            avg_price=r['avg_price'],
            currency=r['currency'],
            asset_class=r['asset_class'],
            broker=r['broker'],
            is_order_history=r['is_order_history'],
            current_price=r['avg_price'],
            pnl_absolute=0.0,
            pnl_percent=0.0,
            day_change_absolute=0.0,
            day_change_percent=0.0,
            xirr=None,
            cashflows=[]
        )
        holdings.append(h)
        
    # If forced refresh, hit Yahoo Finance and update MarketData DB
    if force and tickers_to_fetch:
        try:
            tickers_list = list(tickers_to_fetch)
            tickers_list.append("INR=X")
            data = yf.download(tickers_list, period="5d", group_by="ticker", threads=True, progress=False)
            
            for ticker in tickers_list:
                try:
                    if len(tickers_list) == 1:
                        ticker_data = data
                    else:
                        ticker_data = data[ticker]
                        
                    closes = ticker_data['Close'].dropna()
                    if len(closes) >= 1:
                        current_price = float(closes.iloc[-1])
                        prev_close = float(closes.iloc[-2]) if len(closes) >= 2 else current_price
                        update_market_data(ticker, current_price, prev_close, "INR" if ".NS" in ticker else "USD")
                except Exception as e:
                    pass
        except Exception as e:
            print(f"Force fetch failed: {e}")
            
    # 2. Fetch Market Data from DB
    market_data = get_market_data(list(tickers_to_fetch) + ["INR=X"])
    
    # Also fetch forex
    if "INR=X" in market_data and market_data["INR=X"]["current_price"]:
        _usd_to_inr = market_data["INR=X"]["current_price"]
        
    # 3. Enrich Holdings with Market Data
    for h in holdings:
        yf_ticker = h.ticker
        if h.asset_class == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"
            
        md = market_data.get(yf_ticker)
        if md and md.get("current_price"):
            h.current_price = md["current_price"]
            prev_close = md["previous_close"]
            
            h.pnl_absolute = round((h.current_price - h.avg_price) * h.quantity, 2)
            h.pnl_percent = round((h.current_price - h.avg_price) / h.avg_price * 100, 2) if h.avg_price > 0 else 0
            
            if prev_close and prev_close > 0:
                h.day_change_absolute = round((h.current_price - prev_close) * h.quantity, 2)
                h.day_change_percent = round((h.current_price - prev_close) / prev_close * 100, 2)
                
    # 4. Fetch Other Assets
    other_assets = get_other_assets(email)
    other_assets_list = []
    
    for o in other_assets:
        other_assets_list.append(OtherAsset(
            id=o['id'],
            category=o['category'],
            name=o['name'],
            value=o['value'],
            currency=o['currency'],
            invested_value=o.get('invested_value'),
            investment_date=o.get('investment_date'),
            previous_value=o.get('previous_value'),
            last_updated=o['last_updated']
        ))
        
    # Calculate Net Worth
    total_inr = 0.0
    total_inr += sum([(h.current_price * h.quantity) if h.asset_class != "us_equity" and h.asset_class != "US_EQUITY" else (h.current_price * h.quantity * _usd_to_inr) for h in holdings])
    for o in other_assets_list:
        total_inr += o.value if o.currency == "INR" else (o.value * _usd_to_inr)
        
    state = PortfolioState(
        holdings=holdings,
        other_assets=other_assets_list,
        usd_to_inr=_usd_to_inr,
        net_worth_inr=round(total_inr, 2),
        net_worth_usd=round(total_inr / _usd_to_inr, 2) if _usd_to_inr else 0.0,
        last_sync=datetime.utcnow()
    )
    return state"""

content = re.sub(r'@router\.get\("/state", response_model=PortfolioState\).*?(?=@router\.get\("/quant", response_model=PortfolioQuantMetrics\))', new_state + '\n\n', content, flags=re.DOTALL)

# 3. sync_portfolio
new_sync = """@router.post("/sync")
async def sync_portfolio(
    broker: BrokerType,
    file: UploadFile = File(...),
    email: str = Depends(verify_access),
    session_id: str = Depends(get_session_id)
):
    \"\"\"
    CRITICAL ENDPOINT: CSV Upload + Reconciliation.
    \"\"\"
    from app.db import get_user_holdings, save_user_holdings, log_upload
    from app.services.csv_parser import parse_csv_by_broker
    from app.services.reconciler import reconcile_portfolio
    from app.models import PortfolioHolding
    import os
    
    # 1. Fetch current holdings to reconcile against
    raw_holdings = get_user_holdings(email)
    user_portfolio = []
    for r in raw_holdings:
        h = PortfolioHolding(
            ticker=r['ticker'],
            company_name=r['company_name'],
            quantity=r['quantity'],
            avg_price=r['avg_price'],
            currency=r['currency'],
            asset_class=r['asset_class'],
            broker=r['broker'],
            is_order_history=r['is_order_history'],
            current_price=r['avg_price'],
            pnl_absolute=0.0,
            pnl_percent=0.0,
            day_change_absolute=0.0,
            day_change_percent=0.0
        )
        user_portfolio.append(h)
    
    contents = await file.read()
    
    try:
        csv_holdings = parse_csv_by_broker(contents, broker)
    except Exception as e:
        raise HTTPException(400, detail=str(e))
    
    # Reconcile
    try:
        for h in csv_holdings:
            if h.broker == BrokerType.INDMONEY and h.asset_class in (AssetClass.US_EQUITY, "us_equity", "US_EQUITY") and not getattr(h, 'is_order_history', False):
                if _usd_to_inr > 0:
                    h.avg_price = round(h.avg_price / _usd_to_inr, 4)

        new_holdings = reconcile_portfolio(user_portfolio, csv_holdings, broker)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
        
    # Save the new reconciled holdings to the DB!
    save_user_holdings(email, new_holdings)
    
    # Log the upload activity and save file
    if email and email != "anonymous":
        filename = f"{int(datetime.utcnow().timestamp())}_{broker.value}_{email}.csv"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(contents)
        log_upload(email, broker.value, len(csv_holdings), file_path, session_id)
        
    return {
        "message": f"Synced {len(csv_holdings)} holdings from {broker.value}",
        "total_holdings_now": len(new_holdings)
    }"""

content = re.sub(r'@router\.post\("/sync"\).*?(?=@router\.post\("/manual"\))', new_sync + '\n\n', content, flags=re.DOTALL)

with open(filepath, 'w') as f:
    f.write(content)
