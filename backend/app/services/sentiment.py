"""
Sentiment Analysis Engine.
Uses yfinance to fetch recent news and vaderSentiment to grade the sentiment.
"""

import yfinance as yf
from transformers import pipeline
from app.models import SentimentAnalysis, SentimentGrade

# Load the FinBERT model globally so it's initialized once on startup
# This prevents downloading and loading weights for every API request
try:
    print("Loading FinBERT sentiment model...")
    finbert = pipeline("sentiment-analysis", model="ProsusAI/finbert")
    print("FinBERT model loaded successfully.")
except Exception as e:
    print(f"Failed to load FinBERT model: {e}")
    finbert = None

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

    headlines = []
    grades = []
    
    if news_items and finbert:
        for item in news_items:
            title = ""
            if isinstance(item, dict):
                if "content" in item and isinstance(item["content"], dict):
                    title = item["content"].get("title", "")
                else:
                    title = item.get("title", "")
                    
            if title:
                # Pass the headline through FinBERT
                try:
                    result = finbert(title)[0]
                    label = result['label']
                    
                    if label == "positive":
                        grade = "Bullish"
                    elif label == "negative":
                        grade = "Bearish"
                    else:
                        grade = "Neutral"
                        
                    headlines.append(title)
                    grades.append(grade)
                except Exception as e:
                    print(f"FinBERT analysis failed for headline: {e}")
            
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
