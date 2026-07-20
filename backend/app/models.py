from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum

class BrokerType(str, Enum):
    ZERODHA = "zerodha"
    GROWW = "groww"
    INDMONEY = "indmoney"
    ANGELONE = "angelone"
    RSU = "rsu"

class AssetClass(str, Enum):
    INDIAN_EQUITY = "indian_equity"
    US_EQUITY = "us_equity"
    RSU = "rsu"

class Recommendation(str, Enum):
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"

class SentimentGrade(str, Enum):
    BULLISH = "Bullish"
    NEUTRAL = "Neutral"
    BEARISH = "Bearish"

class EventType(str, Enum):
    EARNINGS = "earnings"
    MACRO = "macro"

class CalendarEvent(BaseModel):
    id: str
    type: EventType
    date: datetime
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None # "high", "medium", "low"

# ==================== CSV / Portfolio Models ====================

class CashFlow(BaseModel):
    date: datetime
    amount: float

class CSVHolding(BaseModel):
    ticker: str
    company_name: str
    quantity: float
    avg_price: float
    broker: BrokerType
    asset_class: AssetClass
    xirr: Optional[float] = None
    cashflows: Optional[List[CashFlow]] = None
    is_order_history: bool = False

class PortfolioSyncRequest(BaseModel):
    holdings: List[CSVHolding]
    broker: BrokerType

class PortfolioHolding(BaseModel):
    id: str
    ticker: str
    company_name: str
    quantity: float
    avg_price: float
    current_price: Optional[float] = None
    broker: BrokerType
    asset_class: AssetClass
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    pnl_absolute: Optional[float] = None
    pnl_percent: Optional[float] = None
    xirr: Optional[float] = None
    cashflows: Optional[List[CashFlow]] = None

class PortfolioState(BaseModel):
    holdings: List[PortfolioHolding]
    net_worth_inr: float
    net_worth_usd: float
    last_sync: datetime
    usd_to_inr: float

# ==================== Analysis Models ====================

class TechnicalIndicators(BaseModel):
    ticker: str
    current_price: Optional[float] = None
    rsi_14_daily: Optional[float] = None
    rsi_14_weekly: Optional[float] = None
    rsi_14_monthly: Optional[float] = None
    macd_daily: Optional[float] = None
    macd_signal_daily: Optional[float] = None
    macd_weekly: Optional[float] = None
    macd_signal_weekly: Optional[float] = None
    macd_monthly: Optional[float] = None
    macd_signal_monthly: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_lower: Optional[float] = None
    bollinger_position: Optional[str] = None  # "above", "mid", "below"
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    trend: Optional[str] = None  # "uptrend", "downtrend", "sideways"
    return_1d: Optional[float] = None
    return_1w: Optional[float] = None
    return_1m: Optional[float] = None
    return_3m: Optional[float] = None
    return_6m: Optional[float] = None
    return_1y: Optional[float] = None
    all_time_high: Optional[float] = None
    chart_pattern: Optional[str] = None
    obv_trend: Optional[str] = None
    vwap_20: Optional[float] = None

class FundamentalMetrics(BaseModel):
    ticker: str
    pe_ratio: Optional[float] = None
    debt_to_equity: Optional[float] = None
    eps_growth_yoy: Optional[float] = None
    roe: Optional[float] = None
    intrinsic_value_estimate: Optional[float] = None
    current_price: Optional[float] = None
    margin_of_safety: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    company_description: Optional[str] = None

class SentimentAnalysis(BaseModel):
    ticker: str
    news_grade: SentimentGrade
    social_grade: SentimentGrade
    overall_grade: SentimentGrade
    headline_count: int
    recent_headlines: List[str]

class VerdictRationale(BaseModel):
    pillar: str  # "Technical", "Fundamental", "Sentiment"
    points: List[str]

class HorizonVerdict(BaseModel):
    horizon: str  # "short", "mid", "long"
    recommendation: Recommendation
    confidence_score: float  # 0-100
    trend: Optional[str] = None
    rationale: List[VerdictRationale]
    overall_summary: str

class QuantMetrics(BaseModel):
    ticker: str
    beta: float
    alpha: float
    sharpe_ratio: float
    sortino_ratio: float
    annualized_return: float
    annualized_volatility: float
    benchmark_ticker: str

class PortfolioQuantMetrics(BaseModel):
    portfolio_beta: float
    portfolio_alpha: float
    portfolio_sharpe: float
    portfolio_sortino: float
    holdings_analyzed: int

class StockRecommendation(BaseModel):
    ticker: str
    company_name: str
    technical: TechnicalIndicators
    fundamental: FundamentalMetrics
    sentiment: SentimentAnalysis
    quant: Optional[QuantMetrics] = None
    horizons: dict[str, HorizonVerdict]