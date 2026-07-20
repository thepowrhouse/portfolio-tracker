import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.models import QuantMetrics

# Number of trading days in a year
TRADING_DAYS = 252

def get_quant_metrics(ticker: str, asset_class: str = "indian_equity") -> QuantMetrics:
    """
    Computes Beta, Alpha, Sharpe, and Sortino ratios for a given stock using 1-year historical daily data.
    """
    yf_ticker = ticker
    benchmark_ticker = "^NSEI" # Nifty 50
    risk_free_rate = 0.07 # 7% for India
    
    if asset_class == "indian_equity" or asset_class == "AssetClass.INDIAN_EQUITY":
        yf_ticker = ticker
        if not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"
    else:
        benchmark_ticker = "^GSPC" # S&P 500
        risk_free_rate = 0.045 # 4.5% for US
        
    try:
        # Fetch 1 year of daily data for both the stock and the benchmark
        data = yf.download(
            tickers=[yf_ticker, benchmark_ticker], 
            period="1y", 
            interval="1d", 
            progress=False
        )['Close']
        
        if data.empty or yf_ticker not in data.columns or benchmark_ticker not in data.columns:
            return _default_quant_metrics(ticker)
            
        # Drop missing values
        data = data.dropna()
        if len(data) < 50:
            return _default_quant_metrics(ticker)
            
        # Calculate daily returns
        returns = data.pct_change().dropna()
        stock_ret = returns[yf_ticker]
        bench_ret = returns[benchmark_ticker]
        
        # 1. Calculate Beta
        covariance = np.cov(stock_ret, bench_ret)[0, 1]
        variance = np.var(bench_ret)
        beta = covariance / variance if variance != 0 else 1.0
        
        # 2. Calculate Annualized Returns
        stock_annual_ret = (1 + stock_ret.mean()) ** TRADING_DAYS - 1
        bench_annual_ret = (1 + bench_ret.mean()) ** TRADING_DAYS - 1
        
        # 3. Calculate Alpha (Jensen's Alpha)
        alpha = stock_annual_ret - (risk_free_rate + beta * (bench_annual_ret - risk_free_rate))
        
        # 4. Calculate Sharpe Ratio
        stock_annual_volatility = stock_ret.std() * np.sqrt(TRADING_DAYS)
        sharpe_ratio = (stock_annual_ret - risk_free_rate) / stock_annual_volatility if stock_annual_volatility != 0 else 0.0
        
        # 5. Calculate Sortino Ratio (Downside deviation only)
        downside_returns = stock_ret[stock_ret < 0]
        downside_volatility = downside_returns.std() * np.sqrt(TRADING_DAYS)
        sortino_ratio = (stock_annual_ret - risk_free_rate) / downside_volatility if downside_volatility != 0 and len(downside_returns) > 0 else 0.0
        
        return QuantMetrics(
            ticker=ticker,
            beta=float(beta),
            alpha=float(alpha),
            sharpe_ratio=float(sharpe_ratio),
            sortino_ratio=float(sortino_ratio),
            annualized_return=float(stock_annual_ret),
            annualized_volatility=float(stock_annual_volatility),
            benchmark_ticker=benchmark_ticker
        )

    except Exception as e:
        print(f"Error calculating quant metrics for {ticker}: {e}")
        return _default_quant_metrics(ticker)

def _default_quant_metrics(ticker: str) -> QuantMetrics:
    return QuantMetrics(
        ticker=ticker,
        beta=1.0,
        alpha=0.0,
        sharpe_ratio=0.0,
        sortino_ratio=0.0,
        annualized_return=0.0,
        annualized_volatility=0.0,
        benchmark_ticker="^NSEI"
    )
