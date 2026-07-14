"""
Investment Recommender Engine.
Combines Technical, Fundamental, and Sentiment into a BUY/HOLD/SELL verdict.
"""

from typing import List
from app.models import (
    TechnicalIndicators, FundamentalMetrics, SentimentAnalysis,
    Recommendation, StockRecommendation, VerdictRationale
)

def score_technical(tech: TechnicalIndicators) -> tuple[float, List[str]]:
    """Returns (score -1 to 1, rationale points)"""
    points = []
    score = 0.0
    
    # --- RSI ---
    if tech.rsi_14_daily is not None:
        if tech.rsi_14_daily < 30:
            score += 0.2
            points.append(f"Daily RSI at {tech.rsi_14_daily} indicates short-term oversold conditions")
        elif tech.rsi_14_daily > 70:
            score -= 0.2
            points.append(f"Daily RSI at {tech.rsi_14_daily} indicates short-term overbought conditions")
    
    if tech.rsi_14_weekly is not None:
        if tech.rsi_14_weekly < 30:
            score += 0.15
            points.append(f"Weekly RSI at {tech.rsi_14_weekly} suggests medium-term value")
        elif tech.rsi_14_weekly > 70:
            score -= 0.15
            points.append(f"Weekly RSI at {tech.rsi_14_weekly} warns of medium-term overextension")

    if tech.rsi_14_monthly is not None:
        if tech.rsi_14_monthly < 30:
            score += 0.1
            points.append(f"Monthly RSI at {tech.rsi_14_monthly} indicates massive secular oversold levels")
        elif tech.rsi_14_monthly > 70:
            score -= 0.1
            points.append(f"Monthly RSI at {tech.rsi_14_monthly} indicates massive secular overbought levels")
            
    # --- MACD ---
    if tech.macd_daily is not None and tech.macd_signal_daily is not None:
        if tech.macd_daily > tech.macd_signal_daily:
            score += 0.1
            points.append("Daily MACD bullish crossover detected")
        else:
            score -= 0.1
            points.append("Daily MACD bearish crossover detected")
            
    if tech.macd_weekly is not None and tech.macd_signal_weekly is not None:
        if tech.macd_weekly > tech.macd_signal_weekly:
            score += 0.1
            points.append("Weekly MACD bullish momentum")
        else:
            score -= 0.1
            points.append("Weekly MACD bearish momentum")
    
    if tech.bollinger_position == "below":
        score += 0.2
        points.append("Price below lower Bollinger Band suggests potential reversal")
    elif tech.bollinger_position == "above":
        score -= 0.2
        points.append("Price above upper Bollinger Band suggests overextension")
    
    if tech.trend == "uptrend":
        score += 0.2
        points.append("SMA 50/200 confirms uptrend")
    elif tech.trend == "downtrend":
        score -= 0.2
        points.append("SMA 50/200 confirms downtrend")
    
    return score, points

def score_fundamental(fund: FundamentalMetrics) -> tuple[float, List[str]]:
    """Returns (score -1 to 1, rationale points)"""
    points = []
    score = 0.0
    
    if fund.pe_ratio is not None:
        if fund.pe_ratio < 15:
            score += 0.3
            points.append(f"P/E at {fund.pe_ratio}x is attractive vs market")
        elif fund.pe_ratio > 40:
            score -= 0.3
            points.append(f"P/E at {fund.pe_ratio}x is stretched vs historical norms")
        else:
            score += 0.05
            points.append(f"P/E at {fund.pe_ratio}x is within reasonable range")
    
    if fund.debt_to_equity is not None:
        if fund.debt_to_equity < 0.5:
            score += 0.2
            points.append(f"Low D/E at {fund.debt_to_equity} indicates strong balance sheet")
        elif fund.debt_to_equity > 2.0:
            score -= 0.2
            points.append(f"High D/E at {fund.debt_to_equity} raises leverage concerns")
    
    if fund.eps_growth_yoy is not None:
        if fund.eps_growth_yoy > 15:
            score += 0.3
            points.append(f"Strong EPS growth of {fund.eps_growth_yoy}% YoY")
        elif fund.eps_growth_yoy < 0:
            score -= 0.2
            points.append(f"Negative EPS growth of {fund.eps_growth_yoy}% YoY")
    
    if fund.margin_of_safety is not None:
        if fund.margin_of_safety > 20:
            score += 0.3
            points.append(f"Margin of safety at {fund.margin_of_safety}% provides downside protection")
        elif fund.margin_of_safety < -20:
            score -= 0.2
            points.append(f"Stock trades at {abs(fund.margin_of_safety)}% premium to intrinsic value")
    
    return score, points

def score_sentiment(sent: SentimentAnalysis) -> tuple[float, List[str]]:
    """Returns (score -1 to 1, rationale points)"""
    points = []
    score = 0.0
    
    if sent.overall_grade.value == "Bullish":
        score += 0.3
        points.append("Overall sentiment is bullish across news and social channels")
    elif sent.overall_grade.value == "Bearish":
        score -= 0.3
        points.append("Overall sentiment is bearish with negative news flow")
    else:
        score += 0.0
        points.append("Sentiment is neutral with mixed signals")
    
    if sent.headline_count > 0:
        points.append(f"Analyzed {sent.headline_count} recent headlines")
    
    return score, points

def generate_recommendation(
    ticker: str,
    company_name: str,
    technical: TechnicalIndicators,
    fundamental: FundamentalMetrics,
    sentiment: SentimentAnalysis
) -> StockRecommendation:
    """
    Master recommender combining all three pillars.
    Score range: -3 (strong sell) to +3 (strong buy)
    """
    tech_score, tech_points = score_technical(technical)
    fund_score, fund_points = score_fundamental(fundamental)
    sent_score, sent_points = score_sentiment(sentiment)
    
    total_score = tech_score + fund_score + sent_score
    
    # Map to recommendation
    if total_score >= 0.5:
        recommendation = Recommendation.BUY
        confidence = min(95, 50 + total_score * 15)
    elif total_score <= -0.5:
        recommendation = Recommendation.SELL
        confidence = min(95, 50 + abs(total_score) * 15)
    else:
        recommendation = Recommendation.HOLD
        confidence = 50 + abs(total_score) * 20
    
    # Build rationale
    rationale = [
        VerdictRationale(pillar="Technical", points=tech_points),
        VerdictRationale(pillar="Fundamental", points=fund_points),
        VerdictRationale(pillar="Sentiment", points=sent_points),
    ]
    
    # Overall summary
    if recommendation == Recommendation.BUY:
        summary = f"Confluence of positive signals across all three pillars supports accumulation. {company_name} shows {technical.trend or 'stable'} technical setup with {fundamental.eps_growth_yoy or 'solid'}% earnings growth and {sentiment.overall_grade.value.lower()} sentiment."
    elif recommendation == Recommendation.SELL:
        summary = f"Multiple red flags detected. {company_name} exhibits {technical.trend or 'concerning'} technical patterns, {fundamental.pe_ratio or 'elevated'}x valuation, and {sentiment.overall_grade.value.lower()} news flow. Consider reducing exposure."
    else:
        summary = f"Mixed signals suggest maintaining current position. {company_name} has offsetting strengths and weaknesses across technical, fundamental, and sentiment dimensions. Wait for clearer direction."
    
    return StockRecommendation(
        ticker=ticker,
        company_name=company_name,
        recommendation=recommendation,
        confidence_score=round(confidence, 1),
        technical=technical,
        fundamental=fundamental,
        sentiment=sentiment,
        rationale=rationale,
        overall_summary=summary
    )