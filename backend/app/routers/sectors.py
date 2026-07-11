from fastapi import APIRouter
from app.services.sectors import get_market_sectors_performance
from app.services.industry_stocks import INDUSTRY_TOP_STOCKS
import yfinance as yf
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional

router = APIRouter(prefix="/api/market", tags=["Market Data"])

@router.get("/sectors")
async def fetch_sectors():
    """
    Fetches market-wide performance for major Nifty Sectoral Indices
    """
    results = await get_market_sectors_performance()
    return {"status": "success", "data": results}


def fetch_stock_performance(ticker_symbol: str) -> Dict:
    import time
    for attempt in range(3):
        try:
            ticker = yf.Ticker(ticker_symbol)
            hist = ticker.history(period="1y")
            
            if hist.empty or len(hist) < 2:
                if attempt < 2:
                    time.sleep(1)
                    continue
                return {
                    "ticker": ticker_symbol,
                    "name": ticker_symbol.replace(".NS", ""),
                    "return_1d": None,
                    "return_1w": None,
                    "return_1m": None,
                    "return_3m": None,
                    "return_6m": None,
                    "return_1y": None
                }
                
            current_price = hist['Close'].iloc[-1]
            
            def calc_ret(days_back: int) -> Optional[float]:
                if len(hist) > days_back:
                    past_price = hist['Close'].iloc[-days_back - 1]
                    return round((current_price - past_price) / past_price * 100, 2)
                return None
                
            return {
                "ticker": ticker_symbol,
                "name": ticker_symbol.replace(".NS", ""),
                "return_1d": calc_ret(1),
                "return_1w": calc_ret(5),
                "return_1m": calc_ret(21),
                "return_3m": calc_ret(63),
                "return_6m": calc_ret(126),
                "return_1y": calc_ret(252) if len(hist) > 250 else calc_ret(len(hist) - 1)
            }
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
                continue
            return {
                "ticker": ticker_symbol,
                "name": ticker_symbol.replace(".NS", ""),
                "return_1d": None,
                "return_1w": None,
                "return_1m": None,
                "return_3m": None,
                "return_6m": None,
                "return_1y": None
            }

@router.get("/industry/{industry_name}")
async def fetch_industry(industry_name: str):
    """
    Fetches the top 5 stocks and their performance for a given granular industry
    """
    tickers = INDUSTRY_TOP_STOCKS.get(industry_name, [])
    if not tickers:
        return {"status": "success", "data": []}
        
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=5) as executor:
        tasks = [
            loop.run_in_executor(executor, fetch_stock_performance, symbol)
            for symbol in tickers
        ]
        results = await asyncio.gather(*tasks)
        
    return {"status": "success", "data": results}
