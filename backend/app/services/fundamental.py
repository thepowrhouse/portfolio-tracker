"""
Fundamental Analysis Engine.
Fetches P/E, D/E, EPS growth, ROE, and estimates intrinsic value.
"""

import yfinance as yf
from typing import Optional
from app.models import FundamentalMetrics

def get_fundamental_analysis(ticker: str, asset_class: str) -> FundamentalMetrics:
    yf_ticker = ticker
    if asset_class == "indian_equity":
        yf_ticker = f"{ticker}.NS"
    
    try:
        stock = yf.Ticker(yf_ticker)
        info = stock.info
        
        # Extract key metrics
        pe_ratio = info.get("trailingPE") or info.get("forwardPE")
        debt_to_equity = info.get("debtToEquity")
        if debt_to_equity and debt_to_equity > 10:
            debt_to_equity = debt_to_equity / 100  # Some APIs return as percentage
        
        eps_growth = info.get("earningsGrowth")
        if eps_growth is None:
            eps_growth = info.get("earningsQuarterlyGrowth")
        
        roe = info.get("returnOnEquity")
        if roe and roe > 1:
            roe = roe * 100  # Convert to percentage if in decimal
        
        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        
        # Intrinsic value estimate (simple DCF-like proxy using Graham formula)
        # IV = EPS * (8.5 + 2g) * 4.4 / Y
        # Where g = expected growth rate, Y = AAA bond yield (~7%)
        intrinsic_value = None
        eps = info.get("trailingEps") or info.get("forwardEps")
        if eps and eps_growth:
            g = eps_growth * 100  # as percentage
            y = 7.0  # Approximate Indian/US AAA yield
            intrinsic_value = eps * (8.5 + 2 * g) * 4.4 / y
        
        margin_of_safety = None
        if intrinsic_value and current_price and current_price > 0:
            margin_of_safety = round((intrinsic_value - current_price) / current_price * 100, 2)
            
        sector = info.get("sector")
        industry = info.get("industry")
        
        if not sector and not industry:
            name = (info.get("shortName") or info.get("longName") or "").upper()
            quote_type = info.get("quoteType", "")
            if "ETF" in name or "BEES" in yf_ticker or "FUND" in name or quote_type == "ETF":
                sector = "Financial Services"
                industry = "Exchange Traded Fund"
            else:
                sector = "Other"
                industry = "Other"
                
        company_description = info.get("longBusinessSummary")
        
        return FundamentalMetrics(
            ticker=ticker,
            pe_ratio=round(pe_ratio, 2) if pe_ratio else None,
            debt_to_equity=round(debt_to_equity, 2) if debt_to_equity else None,
            eps_growth_yoy=round(eps_growth * 100, 2) if eps_growth else None,
            roe=round(roe, 2) if roe else None,
            intrinsic_value_estimate=round(intrinsic_value, 2) if intrinsic_value else None,
            current_price=round(current_price, 2) if current_price else None,
            margin_of_safety=margin_of_safety,
            sector=sector,
            industry=industry,
            company_description=company_description
        )
    except Exception as e:
        print(f"Fundamental analysis error for {ticker}: {e}")
        return FundamentalMetrics(ticker=ticker)