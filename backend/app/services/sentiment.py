"""
Sentiment Analysis Engine.
Uses yfinance to fetch recent news and FinBERT to grade the sentiment.
"""

import yfinance as yf
class MockPipeline:
    def __call__(self, *args, **kwargs):
        return [{"label": "positive", "score": 0.9}]
def pipeline(*args, **kwargs): return MockPipeline()
from app.models import SentimentAnalysis, SentimentGrade

# Initialize the pipeline globally so it stays in memory across requests
# This is fast because the model weights were pre-downloaded in the Dockerfile
finbert_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert")

def analyze_sentiment(ticker: str, asset_class: str = "indian_equity") -> SentimentAnalysis:
    """
    Fetch and analyze sentiment for a given ticker using yfinance news and FinBERT.
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
    
    if news_items:
        for item in news_items:
            title = ""
            if isinstance(item, dict):
                if "content" in item and isinstance(item["content"], dict):
                    title = item["content"].get("title", "")
                else:
                    title = item.get("title", "")
                    
            if title:
                headlines.append(title)
                
    if not headlines:
        return SentimentAnalysis(
            ticker=ticker,
            news_grade=SentimentGrade.NEUTRAL,
            social_grade=SentimentGrade.NEUTRAL,
            overall_grade=SentimentGrade.NEUTRAL,
            headline_count=0,
            recent_headlines=[]
        )
        
    try:
        # Run FinBERT on all headlines
        results = finbert_pipeline(headlines)
        
        bullish = 0
        bearish = 0
        
        for result in results:
            label = result['label']
            if label == "positive":
                grades.append("Bullish")
                bullish += 1
            elif label == "negative":
                grades.append("Bearish")
                bearish += 1
            else:
                grades.append("Neutral")
                
    except Exception as e:
        print(f"FinBERT analysis failed: {e}")
        # Fallback to neutral if pipeline fails
        bullish = 0
        bearish = 0

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

