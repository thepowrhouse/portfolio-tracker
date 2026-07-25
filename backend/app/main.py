from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import portfolio, analysis, sectors, admin, activity, calendar, retirement
from app.db import init_db

app = FastAPI(
    title="Portfolio Tracker API",
    description="Multi-broker portfolio tracking with AI recommendations",
    version="1.0.0"
)

import os

# Allow configurable origins, default to wildcard for easy deployment
origins_env = os.getenv("ALLOWED_ORIGINS")
origins = origins_env.split(",") if origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router)
app.include_router(analysis.router)
app.include_router(sectors.router)
app.include_router(admin.router)
app.include_router(activity.router)
app.include_router(calendar.router)
app.include_router(retirement.router)

import asyncio
import yfinance as yf

async def poll_market_data():
    """Background task to poll Yahoo Finance for all tickers every 60 minutes."""
    from app.db import get_all_unique_tickers, update_market_data
    while True:
        try:
            tickers = get_all_unique_tickers()
            if tickers:
                tickers_list = []
                # Map raw tickers to yfinance tickers
                for raw_ticker, asset_class in tickers:
                    yf_ticker = raw_ticker
                    if asset_class == "indian_equity" and not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
                        yf_ticker += ".NS"
                    tickers_list.append(yf_ticker)
                    
                tickers_list = list(set(tickers_list)) # deduplicate
                # Ensure we also get USD-INR forex rate
                if "INR=X" not in tickers_list:
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
                            currency = "INR" if ".NS" in ticker or ".BO" in ticker else "USD"
                            update_market_data(ticker, current_price, prev_close, currency)
                    except Exception as e:
                        print(f"Background polling error for {ticker}: {e}")
        except Exception as e:
            print(f"Background poller failed: {e}")
            
        await asyncio.sleep(3600)  # Sleep for 1 hour

@app.on_event("startup")
async def startup_event():
    init_db()
    asyncio.create_task(poll_market_data())

@app.get("/health")
async def health():
    return {"status": "ok"}