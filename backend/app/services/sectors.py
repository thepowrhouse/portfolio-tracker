import yfinance as yf
from typing import Dict, List, Optional
import pandas as pd
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor

NIFTY_SECTORS = {
    "Auto": "^CNXAUTO",
    "Banking": "^NSEBANK",
    "IT": "^CNXIT",
    "Pharma": "^CNXPHARMA",
    "FMCG": "^CNXFMCG",
    "Metals & Mining": "^CNXMETAL",
    "Real Estate": "^CNXREALTY",
    "Energy": "^CNXENERGY",
    "Media": "^CNXMEDIA",
    "Financial Services": "^CNXFIN",
    "Infrastructure": "^CNXINFRA",
    "Commodities": "^CNXCMDT"
}

def fetch_sector_performance(sector_name: str, ticker_symbol: str) -> Dict:
    import time
    for attempt in range(3):
        try:
            ticker = yf.Ticker(ticker_symbol)
            # Fetch 1 year of data to compute all timeframes up to 1y
            hist = ticker.history(period="1y")
            
            if hist.empty or len(hist) < 2:
                if attempt < 2:
                    time.sleep(1)
                    continue
                return {
                    "sector": sector_name,
                    "return_1d": None,
                    "return_1w": None,
                    "return_1m": None,
                    "return_3m": None,
                    "return_6m": None,
                    "return_1y": None
                }
                
            current_price = hist['Close'].iloc[-1]
            
            def calculate_return(days_back: int) -> Optional[float]:
                if len(hist) > days_back:
                    # Trading days roughly 252/year. 
                    # 1d = 1, 1w = 5, 1m = 21, 3m = 63, 6m = 126, 1y = 252
                    past_price = hist['Close'].iloc[-days_back - 1]
                    return round((current_price - past_price) / past_price * 100, 2)
                return None
                
            return {
                "sector": sector_name,
                "return_1d": calculate_return(1),
                "return_1w": calculate_return(5),
                "return_1m": calculate_return(21),
                "return_3m": calculate_return(63),
                "return_6m": calculate_return(126),
                "return_1y": calculate_return(252) if len(hist) > 250 else calculate_return(len(hist) - 1)
            }
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
                continue
            print(f"Error fetching {sector_name} ({ticker_symbol}): {e}")
            return {
                "sector": sector_name,
                "return_1d": None,
                "return_1w": None,
                "return_1m": None,
                "return_3m": None,
                "return_6m": None,
                "return_1y": None
            }

from app.services.industry_stocks import INDUSTRY_TOP_STOCKS

def get_bulk_industry_performance() -> Dict[str, Dict]:
    all_tickers = set()
    for tickers in INDUSTRY_TOP_STOCKS.values():
        all_tickers.update(tickers)
        
    if not all_tickers:
        return {}

    import time
    for attempt in range(3):
        try:
            # bulk download
            data = yf.download(list(all_tickers), period="1y", progress=False)
            if data.empty or 'Close' not in data:
                if attempt < 2:
                    time.sleep(1)
                    continue
                return {}
                
            close_prices = data['Close']
            if len(close_prices) < 2:
                if attempt < 2:
                    time.sleep(1)
                    continue
                return {}

            current_prices = close_prices.iloc[-1]
            
            def calc_ret(days_back: int) -> pd.Series:
                if len(close_prices) > days_back:
                    past_prices = close_prices.iloc[-days_back - 1]
                    return (current_prices - past_prices) / past_prices * 100
                return pd.Series(index=current_prices.index)

            ret_1d = calc_ret(1)
            ret_1w = calc_ret(5)
            ret_1m = calc_ret(21)
            ret_3m = calc_ret(63)
            ret_6m = calc_ret(126)
            ret_1y = calc_ret(252) if len(close_prices) > 250 else calc_ret(len(close_prices) - 1)

            industry_perf = {}
            for ind, tickers in INDUSTRY_TOP_STOCKS.items():
                valid_tickers = [t for t in tickers if t in ret_1d.index and pd.notna(ret_1d[t])]
                if not valid_tickers:
                    continue
                    
                industry_perf[ind] = {
                    "return_1d": round(ret_1d[valid_tickers].mean(), 2) if not ret_1d[valid_tickers].isna().all() else None,
                    "return_1w": round(ret_1w[valid_tickers].mean(), 2) if not ret_1w[valid_tickers].isna().all() else None,
                    "return_1m": round(ret_1m[valid_tickers].mean(), 2) if not ret_1m[valid_tickers].isna().all() else None,
                    "return_3m": round(ret_3m[valid_tickers].mean(), 2) if not ret_3m[valid_tickers].isna().all() else None,
                    "return_6m": round(ret_6m[valid_tickers].mean(), 2) if not ret_6m[valid_tickers].isna().all() else None,
                    "return_1y": round(ret_1y[valid_tickers].mean(), 2) if not ret_1y[valid_tickers].isna().all() else None,
                }
                
            return industry_perf
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
                continue
            print(f"Error in bulk download: {e}")
            return {}

async def get_market_sectors_performance() -> List[Dict]:
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=10) as executor:
        tasks = [
            loop.run_in_executor(executor, fetch_sector_performance, name, symbol)
            for name, symbol in NIFTY_SECTORS.items()
        ]
        results = await asyncio.gather(*tasks)
        
    industry_perf = await loop.run_in_executor(None, get_bulk_industry_performance)
    
    for r in results:
        r['industries_market'] = industry_perf

    return results
