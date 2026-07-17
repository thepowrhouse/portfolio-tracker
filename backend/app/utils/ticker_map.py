"""
Maps short broker tickers to full company names and determines asset class.
This is the central mapping layer for all CSV parsers.
"""

TICKER_MAP = {
    # Indian Equities (NSE/BSE)
    "RELIANCE": ("Reliance Industries Ltd", "indian_equity"),
    "TCS": ("Tata Consultancy Services Ltd", "indian_equity"),
    "INFY": ("Infosys Ltd", "indian_equity"),
    "HDFCBANK": ("HDFC Bank Ltd", "indian_equity"),
    "ICICIBANK": ("ICICI Bank Ltd", "indian_equity"),
    "SBIN": ("State Bank of India", "indian_equity"),
    "BHARTIARTL": ("Bharti Airtel Ltd", "indian_equity"),
    "ITC": ("ITC Ltd", "indian_equity"),
    "HINDUNILVR": ("Hindustan Unilever Ltd", "indian_equity"),
    "LT": ("Larsen & Toubro Ltd", "indian_equity"),
    "KOTAKBANK": ("Kotak Mahindra Bank Ltd", "indian_equity"),
    "AXISBANK": ("Axis Bank Ltd", "indian_equity"),
    "BAJFINANCE": ("Bajaj Finance Ltd", "indian_equity"),
    "ASIANPAINT": ("Asian Paints Ltd", "indian_equity"),
    "MARUTI": ("Maruti Suzuki India Ltd", "indian_equity"),
    "TATAMOTORS": ("Tata Motors Ltd", "indian_equity"),
    "SUNPHARMA": ("Sun Pharmaceutical Industries Ltd", "indian_equity"),
    "WIPRO": ("Wipro Ltd", "indian_equity"),
    "ADANIENT": ("Adani Enterprises Ltd", "indian_equity"),
    "HCLTECH": ("HCL Technologies Ltd", "indian_equity"),
    "NESTLEIND": ("Nestle India Ltd", "indian_equity"),
    "ULTRACEMCO": ("UltraTech Cement Ltd", "indian_equity"),
    "TITAN": ("Titan Company Ltd", "indian_equity"),
    "POWERGRID": ("Power Grid Corporation of India Ltd", "indian_equity"),
    "NTPC": ("NTPC Ltd", "indian_equity"),
    "SILVERBEES": ("Nippon India Silver ETF", "indian_equity"),
    
    # US Equities
    "AAPL": ("Apple Inc.", "us_equity"),
    "MSFT": ("Microsoft Corporation", "us_equity"),
    "GOOGL": ("Alphabet Inc.", "us_equity"),
    "AMZN": ("Amazon.com Inc.", "us_equity"),
    "TSLA": ("Tesla Inc.", "us_equity"),
    "META": ("Meta Platforms Inc.", "us_equity"),
    "NVDA": ("NVIDIA Corporation", "us_equity"),
    "JPM": ("JPMorgan Chase & Co.", "us_equity"),
    "V": ("Visa Inc.", "us_equity"),
    "JNJ": ("Johnson & Johnson", "us_equity"),
    "WMT": ("Walmart Inc.", "us_equity"),
    "PG": ("Procter & Gamble Co.", "us_equity"),
    "UNH": ("UnitedHealth Group Inc.", "us_equity"),
    "HD": ("Home Depot Inc.", "us_equity"),
    "MA": ("Mastercard Inc.", "us_equity"),
    "BAC": ("Bank of America Corp", "us_equity"),
    "ABBV": ("AbbVie Inc.", "us_equity"),
    "PFE": ("Pfizer Inc.", "us_equity"),
    "KO": ("Coca-Cola Co.", "us_equity"),
    "PEP": ("PepsiCo Inc.", "us_equity"),
    "COST": ("Costco Wholesale Corp", "us_equity"),
    "TMO": ("Thermo Fisher Scientific Inc.", "us_equity"),
    "AVGO": ("Broadcom Inc.", "us_equity"),
    "DIS": ("Walt Disney Co.", "us_equity"),
    "ADBE": ("Adobe Inc.", "us_equity"),
    "CRM": ("Salesforce Inc.", "us_equity"),
    "NFLX": ("Netflix Inc.", "us_equity"),
    "INTC": ("Intel Corporation", "us_equity"),
    "AMD": ("Advanced Micro Devices Inc.", "us_equity"),
}

import json
import os
from pathlib import Path

# Load ISIN map
ISIN_MAP = {}
try:
    map_path = Path(__file__).parent / "isin_map.json"
    if map_path.exists():
        with open(map_path, "r", encoding="utf-8") as f:
            ISIN_MAP = json.load(f)
except Exception:
    pass


def clean_ticker(ticker: str) -> str:
    """Removes common exchange suffixes from raw tickers."""
    ticker = ticker.strip().upper()
    for suffix in ['-BE', '-BZ', '-EQ', '.NS', '.BO']:
        if ticker.endswith(suffix):
            ticker = ticker[:-len(suffix)]
    return ticker

def get_ticker_from_isin(isin: str) -> str:
    """Returns the NSE symbol if the string is an ISIN, else returns the string as-is."""
    cleaned = isin.strip().upper()
    if cleaned.startswith("IN") and len(cleaned) == 12:
        return clean_ticker(ISIN_MAP.get(cleaned, cleaned))
    return clean_ticker(cleaned)

def resolve_ticker(raw_ticker: str) -> tuple[str, str]:
    """
    Returns (full_company_name, asset_class) for a given ticker.
    Falls back to raw_ticker as name if unknown.
    """
    raw_ticker = get_ticker_from_isin(raw_ticker)
    cleaned = raw_ticker.strip().upper().replace(".NS", "").replace(".BO", "").replace(".NSE", "")
    if cleaned in TICKER_MAP:
        return TICKER_MAP[cleaned]
    # Fallback: try without common suffixes
    for suffix in [".NS", ".BO", ".NSE", ".BSE", ".US", "-IN"]:
        if cleaned.endswith(suffix):
            base = cleaned[:-len(suffix)]
            if base in TICKER_MAP:
                return TICKER_MAP[base]
    # Unknown ticker: return as-is with best-guess asset class
    return (raw_ticker, "indian_equity")

def is_indian_ticker(ticker: str) -> bool:
    name, asset_class = resolve_ticker(ticker)
    return asset_class == "indian_equity"

def is_us_ticker(ticker: str) -> bool:
    name, asset_class = resolve_ticker(ticker)
    return asset_class == "us_equity"