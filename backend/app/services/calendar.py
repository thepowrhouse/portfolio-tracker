import yfinance as yf
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.models import CalendarEvent, EventType, PortfolioHolding

def get_upcoming_earnings(holdings: List[PortfolioHolding]) -> List[CalendarEvent]:
    events = []
    # Deduplicate tickers
    unique_tickers = {h.ticker: h for h in holdings}
    
    now = datetime.utcnow()
    
    for idx, (ticker, holding) in enumerate(unique_tickers.items()):
        # Mocking earnings dates spread across the next 30 days for demonstration
        # A robust solution would use a dedicated earnings API (like AlphaVantage / FMP)
        days_ahead = (idx * 7) % 30 + 2
        mock_date = now + timedelta(days=days_ahead)
        
        events.append(
            CalendarEvent(
                id=str(uuid.uuid4()),
                type=EventType.EARNINGS,
                date=mock_date,
                title=f"{holding.company_name} ({ticker}) Earnings",
                description=f"Q{((now.month - 1) // 3) + 1} Earnings Release",
                severity="medium"
            )
        )
        
    return events

def get_macro_events() -> List[CalendarEvent]:
    """
    Returns a predefined list of major upcoming macro-economic events.
    In a production system, this would be scraped from an economic calendar or fetched via an API.
    """
    now = datetime.utcnow()
    
    events = [
        CalendarEvent(
            id=str(uuid.uuid4()),
            type=EventType.MACRO,
            date=now + timedelta(days=5),
            title="FOMC Meeting & Interest Rate Decision",
            description="Federal Reserve interest rate decision and press conference.",
            severity="high"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            type=EventType.MACRO,
            date=now + timedelta(days=12),
            title="CPI Inflation Data Release",
            description="US Consumer Price Index (CPI) year-over-year data release.",
            severity="high"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            type=EventType.MACRO,
            date=now + timedelta(days=18),
            title="Non-Farm Payrolls (NFP)",
            description="US Monthly Employment Report.",
            severity="medium"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            type=EventType.MACRO,
            date=now + timedelta(days=25),
            title="GDP Growth Rate (QoQ)",
            description="Preliminary US Gross Domestic Product data.",
            severity="medium"
        )
    ]
    
    return events
