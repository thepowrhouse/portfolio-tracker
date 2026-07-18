"""
Sentiment Analysis Engine.
Uses yfinance to fetch recent news and vaderSentiment to grade the sentiment.
"""

import yfinance as yf
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from app.models import SentimentAnalysis, SentimentGrade

def get_vader_grade(compound_score: float) -> str:
    """Map VADER compound score to a sentiment grade string."""
    if compound_score >= 0.05:
        return "Bullish"
    elif compound_score <= -0.05:
        return "Bearish"
    else:
        return "Neutral"

def analyze_sentiment(ticker: str, asset_class: str = "indian_equity") -> SentimentAnalysis:
    """
    Fetch and analyze sentiment for a given ticker using yfinance news and VADER.
    """
    yf_ticker = ticker
    if asset_class == "indian_equity" or asset_class == "AssetClass.INDIAN_EQUITY":
        yf_ticker = ticker
        if not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.endswith(".BSE"):
            yf_ticker += ".NS"

    try:
        stock = yf.Ticker(yf_ticker)
        news_items = stock.news
    except Exception as e:
        print(f"Failed to fetch news for {ticker}: {e}")
        news_items = []

    analyzer = SentimentIntensityAnalyzer()
    
    headlines = []
    grades = []
    
    if news_items:
        for item in news_items:
            title = ""
            if isinstance(item, dict):
                if "content" in item and isinstance(item["content"], dict):
                    title = item["content"].get("title", "")
                else:
                    title = item.get("title", "")
                    
            if title:
                score = analyzer.polarity_scores(title)
                grade = get_vader_grade(score['compound'])
                
                headlines.append(title)
                grades.append(grade)
            
    if not headlines:
        return SentimentAnalysis(
            ticker=ticker,
            news_grade=SentimentGrade.NEUTRAL,
            social_grade=SentimentGrade.NEUTRAL,
            overall_grade=SentimentGrade.NEUTRAL,
            headline_count=0,
            recent_headlines=[]
        )
        
    bullish = grades.count("Bullish")
    bearish = grades.count("Bearish")
    
    if bullish > bearish:
        overall = SentimentGrade.BULLISH
    elif bearish > bullish:
        overall = SentimentGrade.BEARISH
    else:
        overall = SentimentGrade.NEUTRAL
        
    return SentimentAnalysis(
        ticker=ticker,
        news_grade=overall,
        social_grade=overall,
        overall_grade=overall,
        headline_count=len(headlines),
        recent_headlines=headlines[:5]
    )
