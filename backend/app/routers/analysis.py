from fastapi import APIRouter, HTTPException, Depends
from typing import List
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.models import StockRecommendation
from app.services.technical import get_technical_analysis
from app.services.fundamental import get_fundamental_analysis
from app.services.sentiment import analyze_sentiment
from app.services.recommender import generate_recommendation
from app.routers.portfolio import _portfolio_db, verify_access

router = APIRouter(prefix="/analysis", tags=["analysis"])

def analyze_single_holding(holding):
    technical = get_technical_analysis(holding.ticker, holding.asset_class)
    fundamental = get_fundamental_analysis(holding.ticker, holding.asset_class)
    sentiment = analyze_sentiment(holding.ticker, holding.asset_class)
    
    return generate_recommendation(
        ticker=holding.ticker,
        company_name=holding.company_name,
        technical=technical,
        fundamental=fundamental,
        sentiment=sentiment
    )

@router.get("/batch", response_model=List[StockRecommendation])
async def get_batch_analysis(email: str = Depends(verify_access)):
    """
    Fetch analysis for ALL holdings in portfolio.
    Called after CSV sync to refresh all recommendations.
    """
    user_portfolio = _portfolio_db[email]
    if not user_portfolio:
        return []
        
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=10) as executor:
        tasks = [
            loop.run_in_executor(executor, analyze_single_holding, holding)
            for holding in user_portfolio
        ]
        results = await asyncio.gather(*tasks)
    
    return results

@router.get("/{ticker}", response_model=StockRecommendation)
async def get_stock_analysis(ticker: str, email: str = Depends(verify_access)):
    """
    Fetch complete analysis for a single stock.
    Called by frontend when expanding a stock row.
    """
    user_portfolio = _portfolio_db[email]
    # Find holding to get asset class
    holding = next(
        (h for h in user_portfolio if h.ticker.upper() == ticker.upper()),
        None
    )
    
    asset_class = holding.asset_class if holding else "us_equity"
    company_name = holding.company_name if holding else ticker
    
    technical = get_technical_analysis(ticker, asset_class)
    fundamental = get_fundamental_analysis(ticker, asset_class)
    sentiment = analyze_sentiment(ticker, asset_class)
    
    recommendation = generate_recommendation(
        ticker=ticker,
        company_name=company_name,
        technical=technical,
        fundamental=fundamental,
        sentiment=sentiment
    )
    
    return recommendation