export type BrokerType = "zerodha" | "groww" | "indmoney" | "rsu";
export type AssetClass = "indian_equity" | "us_equity" | "rsu";
export type Recommendation = "BUY" | "HOLD" | "SELL";
export type SentimentGrade = "Bullish" | "Neutral" | "Bearish";

export interface PortfolioHolding {
  id: string;
  ticker: string;
  company_name: string;
  quantity: number;
  avg_price: number;
  current_price: number | null;
  broker: BrokerType;
  asset_class: AssetClass;
  last_updated: string;
  pnl_absolute: number | null;
  pnl_percent: number | null;
  xirr?: number | null;
}

export interface PortfolioState {
  holdings: PortfolioHolding[];
  net_worth_inr: number;
  net_worth_usd: number;
  last_sync: string;
  usd_to_inr: number;
}

export interface TechnicalIndicators {
  ticker: string;
  current_price: number | null;
  rsi_14_daily: number | null;
  rsi_14_weekly: number | null;
  rsi_14_monthly: number | null;
  macd_daily: number | null;
  macd_signal_daily: number | null;
  macd_weekly: number | null;
  macd_signal_weekly: number | null;
  macd_monthly: number | null;
  macd_signal_monthly: number | null;
  bollinger_upper: number | null;
  bollinger_lower: number | null;
  bollinger_position: string | null;
  sma_50: number | null;
  sma_200: number | null;
  trend: string | null;
  return_1d?: number | null;
  return_1w?: number | null;
  return_1m?: number | null;
  return_3m?: number | null;
  return_6m?: number | null;
  return_1y?: number | null;
  all_time_high?: number | null;
  chart_pattern?: string | null;
  obv_trend?: "accumulation" | "distribution" | null;
  vwap_20?: number | null;
}

export interface FundamentalMetrics {
  ticker: string;
  pe_ratio: number | null;
  debt_to_equity: number | null;
  eps_growth_yoy: number | null;
  roe: number | null;
  intrinsic_value_estimate: number | null;
  current_price: number | null;
  margin_of_safety: number | null;
  sector?: string | null;
  industry?: string | null;
  company_description?: string | null;
}

export interface SentimentAnalysis {
  ticker: string;
  news_grade: SentimentGrade;
  social_grade: SentimentGrade;
  overall_grade: SentimentGrade;
  headline_count: number;
  recent_headlines: string[];
}

export interface VerdictRationale {
  pillar: string;
  points: string[];
}

export interface HorizonVerdict {
  horizon: string;
  recommendation: Recommendation;
  confidence_score: number;
  trend?: string | null;
  rationale: VerdictRationale[];
  overall_summary: string;
}

export interface StockRecommendation {
  ticker: string;
  company_name: string;
  technical: TechnicalIndicators;
  fundamental: FundamentalMetrics;
  sentiment: SentimentAnalysis;
  horizons: { [key: string]: HorizonVerdict };
}