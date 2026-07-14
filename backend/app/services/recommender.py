"""
Investment Recommender Engine.
Combines Technical, Fundamental, and Sentiment into a BUY/HOLD/SELL verdict.
"""

from typing import List
from app.models import (
    TechnicalIndicators, FundamentalMetrics, SentimentAnalysis,
    Recommendation, StockRecommendation, VerdictRationale, HorizonVerdict
)

def score_technical(tech: TechnicalIndicators, horizon: str) -> tuple[float, List[str]]:
    """Returns (score -1 to 1, rationale points) based on horizon: 'short', 'mid', 'long'"""
    points = []
    score = 0.0
    
    if horizon == "short":
        if tech.rsi_14_daily is not None:
            if tech.rsi_14_daily < 30:
                score += 0.5
                points.append(f"Daily RSI ({tech.rsi_14_daily}) indicates short-term oversold conditions")
            elif tech.rsi_14_daily > 70:
                score -= 0.5
                points.append(f"Daily RSI ({tech.rsi_14_daily}) indicates short-term overbought conditions")
        if tech.macd_daily is not None and tech.macd_signal_daily is not None:
            if tech.macd_daily > tech.macd_signal_daily:
                score += 0.3
                points.append("Daily MACD bullish crossover detected")
            else:
                score -= 0.3
                points.append("Daily MACD bearish crossover detected")
        if tech.bollinger_position == "below":
            score += 0.2
            points.append("Price below lower Bollinger Band suggests potential reversal")
        elif tech.bollinger_position == "above":
            score -= 0.2
            points.append("Price above upper Bollinger Band suggests overextension")

    elif horizon == "mid":
        if tech.rsi_14_weekly is not None:
            if tech.rsi_14_weekly < 30:
                score += 0.4
                points.append(f"Weekly RSI ({tech.rsi_14_weekly}) suggests medium-term value")
            elif tech.rsi_14_weekly > 70:
                score -= 0.4
                points.append(f"Weekly RSI ({tech.rsi_14_weekly}) warns of medium-term overextension")
        if tech.macd_weekly is not None and tech.macd_signal_weekly is not None:
            if tech.macd_weekly > tech.macd_signal_weekly:
                score += 0.3
                points.append("Weekly MACD bullish momentum")
            else:
                score -= 0.3
                points.append("Weekly MACD bearish momentum")
        if tech.trend == "uptrend":
            score += 0.3
            points.append("SMA 50/200 confirms medium-term uptrend")
        elif tech.trend == "downtrend":
            score -= 0.3
            points.append("SMA 50/200 confirms medium-term downtrend")

    elif horizon == "long":
        if tech.rsi_14_monthly is not None:
            if tech.rsi_14_monthly < 30:
                score += 0.5
                points.append(f"Monthly RSI ({tech.rsi_14_monthly}) indicates massive secular oversold levels")
            elif tech.rsi_14_monthly > 70:
                score -= 0.5
                points.append(f"Monthly RSI ({tech.rsi_14_monthly}) indicates massive secular overbought levels")
        if tech.trend == "uptrend":
            score += 0.5
            points.append("Long-term moving averages confirm structural uptrend")
        elif tech.trend == "downtrend":
            score -= 0.5
            points.append("Long-term moving averages confirm structural downtrend")

    return score, points

def score_fundamental(fund: FundamentalMetrics, horizon: str) -> tuple[float, List[str]]:
    """Returns (score -1 to 1, rationale points) based on horizon"""
    points = []
    score = 0.0
    
    # Fundamentals matter more for longer horizons
    weight = 0.2 if horizon == "short" else 1.0 if horizon == "mid" else 1.5

    if fund.pe_ratio is not None:
        if fund.pe_ratio < 15:
            score += 0.3 * weight
            points.append(f"P/E at {fund.pe_ratio}x is attractive vs market")
        elif fund.pe_ratio > 40:
            score -= 0.3 * weight
            points.append(f"P/E at {fund.pe_ratio}x is highly elevated")
    
    if fund.debt_to_equity is not None:
        if fund.debt_to_equity < 0.5:
            score += 0.2 * weight
            points.append(f"Strong balance sheet with low D/E ({fund.debt_to_equity})")
        elif fund.debt_to_equity > 2.0:
            score -= 0.2 * weight
            points.append(f"High leverage with D/E at {fund.debt_to_equity}")
    
    if fund.eps_growth_yoy is not None:
        if fund.eps_growth_yoy > 15:
            score += 0.3 * weight
            points.append(f"Strong earnings growth of {fund.eps_growth_yoy}% YoY")
        elif fund.eps_growth_yoy < 0:
            score -= 0.3 * weight
            points.append(f"Declining earnings ({fund.eps_growth_yoy}% YoY)")
            
    if fund.margin_of_safety is not None:
        if fund.margin_of_safety > 20:
            score += 0.2 * weight
            points.append(f"Margin of safety at {fund.margin_of_safety}% provides downside protection")
        elif fund.margin_of_safety < -20:
            score -= 0.2 * weight
            points.append(f"Stock trades at {abs(fund.margin_of_safety)}% premium to intrinsic value")
    
    return score, points

def score_sentiment(sent: SentimentAnalysis, horizon: str) -> tuple[float, List[str]]:
    """Returns (score -1 to 1, rationale points) based on horizon"""
    points = []
    score = 0.0
    
    # Sentiment matters more for short term, less for long term
    weight = 1.0 if horizon == "short" else 0.5 if horizon == "mid" else 0.2

    if sent.overall_grade.value == "Bullish":
        score += 0.3 * weight
        points.append("Overall sentiment is bullish across news and social channels")
    elif sent.overall_grade.value == "Bearish":
        score -= 0.3 * weight
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
    Master recommender generating short, mid, and long term horizons.
    """
    horizons = {}
    
    for horizon in ["short", "mid", "long"]:
        tech_score, tech_points = score_technical(technical, horizon)
        fund_score, fund_points = score_fundamental(fundamental, horizon)
        sent_score, sent_points = score_sentiment(sentiment, horizon)
        
        # Normalize total score for the horizon
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
            summary = f"Confluence of positive signals supports a {horizon}-term BUY. {company_name} shows favorable dynamics across multiple pillars."
        elif recommendation == Recommendation.SELL:
            summary = f"Multiple red flags detected for the {horizon}-term. Consider reducing exposure to {company_name}."
        else:
            summary = f"Mixed signals suggest maintaining current position for the {horizon}-term. Wait for clearer direction."
            
        # Determine trend for this horizon
        horizon_trend = "sideways"
        if horizon == "short":
            if technical.macd_daily is not None and technical.macd_signal_daily is not None:
                horizon_trend = "uptrend" if technical.macd_daily > technical.macd_signal_daily else "downtrend"
            else:
                horizon_trend = technical.trend or "sideways"
        elif horizon == "mid":
            if technical.macd_weekly is not None and technical.macd_signal_weekly is not None:
                horizon_trend = "uptrend" if technical.macd_weekly > technical.macd_signal_weekly else "downtrend"
            else:
                horizon_trend = technical.trend or "sideways"
        elif horizon == "long":
            if technical.macd_monthly is not None and technical.macd_signal_monthly is not None:
                horizon_trend = "uptrend" if technical.macd_monthly > technical.macd_signal_monthly else "downtrend"
            else:
                horizon_trend = technical.trend or "sideways"
            
        horizons[horizon] = HorizonVerdict(
            horizon=horizon,
            recommendation=recommendation,
            confidence_score=round(confidence, 1),
            trend=horizon_trend,
            rationale=rationale,
            overall_summary=summary
        )
    
    return StockRecommendation(
        ticker=ticker,
        company_name=company_name,
        technical=technical,
        fundamental=fundamental,
        sentiment=sentiment,
        horizons=horizons
    )