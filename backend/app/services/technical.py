"""
Technical Analysis Engine using yfinance.
Computes RSI, MACD, Bollinger Bands, SMA crossovers.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional
from app.models import TechnicalIndicators

def compute_rsi(prices: pd.Series, period: int = 14) -> float:
    delta = prices.diff()
    gain = delta.where(delta > 0, 0).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi.iloc[-1], 2) if not pd.isna(rsi.iloc[-1]) else None

def compute_macd(prices: pd.Series) -> tuple:
    ema_12 = prices.ewm(span=12).mean()
    ema_26 = prices.ewm(span=26).mean()
    macd_line = ema_12 - ema_26
    signal_line = macd_line.ewm(span=9).mean()
    return round(macd_line.iloc[-1], 2), round(signal_line.iloc[-1], 2)

def compute_bollinger(prices: pd.Series, period: int = 20) -> tuple:
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std * 2)
    lower = sma - (std * 2)
    last_price = prices.iloc[-1]
    if last_price > upper.iloc[-1]:
        pos = "above"
    elif last_price < lower.iloc[-1]:
        pos = "below"
    else:
        pos = "mid"
    return round(upper.iloc[-1], 2), round(lower.iloc[-1], 2), pos

def compute_obv(close: pd.Series, volume: pd.Series, is_indian: bool) -> tuple[Optional[str], Optional[str]]:
    if len(close) < 20:
        return None, None
    # Calculate daily OBV
    obv = (np.sign(close.diff()) * volume).fillna(0).cumsum()
    # Check trend by comparing current OBV to its 20-day SMA
    obv_sma20 = obv.rolling(20).mean()
    if pd.isna(obv_sma20.iloc[-1]):
        return None, None
    
    trend = "accumulation" if obv.iloc[-1] > obv_sma20.iloc[-1] else "distribution"
    val = obv.iloc[-1]
    
    if is_indian:
        fmt_val = f"{val / 10000000:.2f} Cr"
    else:
        fmt_val = f"{val / 1000000:.2f} M"
        
    if val > 0:
        fmt_val = "+" + fmt_val
        
    return trend, fmt_val

def compute_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> tuple[Optional[float], Optional[float], Optional[float]]:
    if len(close) < period + 1:
        return None, None, None
    up = high.diff()
    down = low.diff() * -1
    pos_dm = np.where((up > down) & (up > 0), up, 0.0)
    neg_dm = np.where((down > up) & (down > 0), down, 0.0)
    
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    pos_di = 100 * (pd.Series(pos_dm, index=high.index).ewm(alpha=1/period, adjust=False).mean() / atr)
    neg_di = 100 * (pd.Series(neg_dm, index=low.index).ewm(alpha=1/period, adjust=False).mean() / atr)
    
    dx = 100 * abs(pos_di - neg_di) / (pos_di + neg_di).replace(0, np.nan)
    adx = dx.ewm(alpha=1/period, adjust=False).mean()
    
    if pd.isna(adx.iloc[-1]):
        return None, None, None
    return round(adx.iloc[-1], 2), round(pos_di.iloc[-1], 2), round(neg_di.iloc[-1], 2)

def compute_williams_r(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> Optional[float]:
    if len(close) < period:
        return None
    hh = high.rolling(window=period).max()
    ll = low.rolling(window=period).min()
    wr = -100 * (hh - close) / (hh - ll)
    return round(wr.iloc[-1], 2) if not pd.isna(wr.iloc[-1]) else None

def compute_stochastic_k(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> Optional[float]:
    if len(close) < period:
        return None
    hh = high.rolling(window=period).max()
    ll = low.rolling(window=period).min()
    stoch_k = 100 * (close - ll) / (hh - ll)
    return round(stoch_k.iloc[-1], 2) if not pd.isna(stoch_k.iloc[-1]) else None

def compute_vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series, period: int = 20) -> Optional[float]:
    if len(close) < period:
        return None
    typical_price = (high + low + close) / 3
    rolling_vwap = (typical_price * volume).rolling(window=period).sum() / volume.rolling(window=period).sum()
    if pd.isna(rolling_vwap.iloc[-1]):
        return None
    return round(rolling_vwap.iloc[-1], 2)

def detect_chart_pattern(prices: pd.Series) -> Optional[str]:
    if len(prices) < 60:
        return None
        
    recent = prices.tail(126)
    smoothed = recent.rolling(window=5, center=True).mean()
    
    local_max = smoothed[(smoothed == smoothed.rolling(window=11, center=True).max())].dropna()
    local_min = smoothed[(smoothed == smoothed.rolling(window=11, center=True).min())].dropna()
    
    local_max = local_max[local_max.shift(1) != local_max]
    local_min = local_min[local_min.shift(1) != local_min]
    
    if len(local_max) >= 3:
        p1, p2, p3 = local_max.iloc[-3], local_max.iloc[-2], local_max.iloc[-1]
        if p2 > p1 and p2 > p3 and abs(p1 - p3) / p1 < 0.05:
            return "Head and Shoulders"
            
    if len(local_min) >= 3:
        t1, t2, t3 = local_min.iloc[-3], local_min.iloc[-2], local_min.iloc[-1]
        if t2 < t1 and t2 < t3 and abs(t1 - t3) / t1 < 0.05:
            return "Inverse Head & Shoulders"
            
    if len(local_max) >= 2:
        p1, p2 = local_max.iloc[-2], local_max.iloc[-1]
        if abs(p1 - p2) / p1 < 0.03:
            between_min = smoothed.loc[local_max.index[-2]:local_max.index[-1]].min()
            if (p1 - between_min) / p1 > 0.05:
                return "Double Top"
                
    if len(local_min) >= 2:
        t1, t2 = local_min.iloc[-2], local_min.iloc[-1]
        if abs(t1 - t2) / t1 < 0.03:
            between_max = smoothed.loc[local_min.index[-2]:local_min.index[-1]].max()
            if (between_max - t1) / t1 > 0.05:
                return "Double Bottom"
                
    recent_30 = recent.tail(30)
    if len(recent_30) == 30:
        move_start = recent_30.iloc[0]
        move_peak = recent_30.iloc[19]
        current = recent_30.iloc[-1]
        
        if (move_peak - move_start) / move_start > 0.15:
            if current < move_peak and (move_peak - current) / move_peak < 0.08:
                return "Bull Flag"
                
        if (move_start - move_peak) / move_start > 0.15:
            if current > move_peak and (current - move_peak) / move_peak < 0.08:
                return "Bear Flag"
                
    return None

def get_technical_analysis(ticker: str, asset_class: str) -> TechnicalIndicators:
    """
    Fetch historical data and compute technical indicators.
    """
    # Adjust ticker for yfinance
    yf_ticker = ticker
    if asset_class == "indian_equity":
        yf_ticker = ticker
        if not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"
    
    import time
    for attempt in range(3):
        try:
            stock = yf.Ticker(yf_ticker)
            hist = stock.history(period="max")
            
            if hist.empty or len(hist) < 50:
                if attempt < 2:
                    time.sleep(1)
                    continue
                return TechnicalIndicators(ticker=ticker)
                
            hist = hist.dropna(subset=["Close", "High", "Low", "Volume"])
            if hist.empty or len(hist) < 50:
                return TechnicalIndicators(ticker=ticker)
            
            close = hist["Close"]
            high = hist["High"]
            low = hist["Low"]
            volume = hist["Volume"]
            last_price = close.iloc[-1]
            
            rsi = compute_rsi(close)
            macd, macd_signal = compute_macd(close)
            is_indian = asset_class == "indian_equity"
            obv_trend, obv_formatted = compute_obv(close, volume, is_indian)
            vwap_20 = compute_vwap(high, low, close, volume)
            
            adx, adx_di_plus, adx_di_minus = compute_adx(high, low, close)
            williams_r = compute_williams_r(high, low, close)
            stoch_k = compute_stochastic_k(high, low, close)
            
            # Weekly (W-FRI)
            close_weekly = close.resample('W-FRI').last().dropna()
            rsi_weekly = compute_rsi(close_weekly) if len(close_weekly) > 14 else None
            macd_weekly, macd_signal_weekly = compute_macd(close_weekly) if len(close_weekly) > 26 else (None, None)
            
            # Monthly (ME)
            close_monthly = close.resample('ME').last().dropna()
            rsi_monthly = compute_rsi(close_monthly) if len(close_monthly) > 14 else None
            macd_monthly, macd_signal_monthly = compute_macd(close_monthly) if len(close_monthly) > 26 else (None, None)
            bb_upper, bb_lower, bb_pos = compute_bollinger(close)
            sma_50 = round(close.rolling(50).mean().iloc[-1], 2)
            sma_200 = round(close.rolling(200).mean().iloc[-1], 2) if len(close) >= 200 else None
            
            chart_pattern = detect_chart_pattern(close)
            
            # Trend determination
            if sma_50 and sma_200:
                if sma_50 > sma_200:
                    trend = "uptrend"
                elif sma_50 < sma_200 * 0.95:
                    trend = "downtrend"
                else:
                    trend = "sideways"
            else:
                trend = "sideways"
                
            # Calculate Returns
            def get_return(days_ago: int) -> Optional[float]:
                if len(close) > days_ago:
                    past_price = close.iloc[-(days_ago + 1)]
                    return round(((last_price - past_price) / past_price) * 100, 2)
                return None

            # Trading days approximations
            return_1d = get_return(1)
            return_1w = get_return(5)
            return_1m = get_return(21)
            return_3m = get_return(63)
            return_6m = get_return(126)
            return_1y = get_return(252)
            
            all_time_high = round(hist["High"].max(), 2)
            
            return TechnicalIndicators(
                ticker=ticker,
                current_price=round(last_price, 2),
                rsi_14_daily=rsi,
                rsi_14_weekly=rsi_weekly,
                rsi_14_monthly=rsi_monthly,
                macd_daily=macd,
                macd_signal_daily=macd_signal,
                macd_weekly=macd_weekly,
                macd_signal_weekly=macd_signal_weekly,
                macd_monthly=macd_monthly,
                macd_signal_monthly=macd_signal_monthly,
                bollinger_upper=bb_upper,
                bollinger_lower=bb_lower,
                bollinger_position=bb_pos,
                sma_50=sma_50,
                sma_200=sma_200,
                trend=trend,
                return_1d=return_1d,
                return_1w=return_1w,
                return_1m=return_1m,
                return_3m=return_3m,
                return_6m=return_6m,
                return_1y=return_1y,
                all_time_high=round(all_time_high, 2) if pd.notna(all_time_high) else None,
                chart_pattern=chart_pattern,
                obv_trend=obv_trend,
                vwap_20=vwap_20,
                adx=adx,
                adx_di_plus=adx_di_plus,
                adx_di_minus=adx_di_minus,
                williams_r=williams_r,
                stoch_k=stoch_k,
                obv_value_formatted=obv_formatted
            )
            
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
                continue
            print(f"Technical analysis error for {ticker}: {e}")
            return TechnicalIndicators(ticker=ticker)