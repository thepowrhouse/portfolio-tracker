from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.models import RetirementPlan, WithdrawalBucket
from app.routers.portfolio import verify_access, get_portfolio_state

router = APIRouter(prefix="/retirement", tags=["retirement"])

@router.get("/plan", response_model=RetirementPlan)
async def get_retirement_plan(
    target_corpus: float = 100000000.0,
    real_estate_yield: float = 0.03,
    debt_yield: float = 0.07,
    equity_yield: float = 0.015,
    email: str = Depends(verify_access)
):
    # Fetch the complete portfolio state using the existing function
    portfolio_state = await get_portfolio_state(force=False, email=email)
    
    total_corpus = portfolio_state.net_worth_inr
    
    monthly_passive_income = 0.0
    
    buckets: Dict[int, WithdrawalBucket] = {
        1: WithdrawalBucket(bucket_name="Immediate Liquidity (Sell First)", priority=1, description="Cash, Liquid Funds, underperforming or overvalued equity.", assets=[]),
        2: WithdrawalBucket(bucket_name="Mid-Term (1-5 Years)", priority=2, description="Standard equity holdings, Mutual Funds, Gold.", assets=[]),
        3: WithdrawalBucket(bucket_name="Long-Term (Tax-Free Compounding)", priority=3, description="PPF, NPS. Do not touch until maturity.", assets=[]),
        4: WithdrawalBucket(bucket_name="Income Generating (Sell Last)", priority=4, description="Real Estate, High-Yield Bonds.", assets=[])
    }
    
    asset_allocation = {"equity": 0, "debt": 0, "real_estate": 0, "gold": 0, "other": 0}
    
    # Process Other Assets
    for asset in portfolio_state.other_assets:
        val = asset.value
        # For USD assets, convert to INR
        if asset.currency == "USD":
            val *= portfolio_state.usd_to_inr
            
        category = asset.category.value if hasattr(asset.category, "value") else asset.category
        
        # Yield assumptions
        if category == "real_estate":
            monthly_passive_income += (val * real_estate_yield) / 12
            buckets[4].assets.append({"name": asset.name, "category": "Real Estate", "value": val})
            asset_allocation["real_estate"] += val
        elif category in ["fixed_income", "bonds"]:
            monthly_passive_income += (val * debt_yield) / 12
            buckets[4].assets.append({"name": asset.name, "category": "Fixed Income", "value": val})
            asset_allocation["debt"] += val
        elif category in ["ppf", "nps"]:
            buckets[3].assets.append({"name": asset.name, "category": category.upper(), "value": val})
            asset_allocation["debt"] += val
        elif category == "savings_bank":
            buckets[1].assets.append({"name": asset.name, "category": "Savings Account", "value": val})
            asset_allocation["debt"] += val
        elif category == "gold":
            buckets[2].assets.append({"name": asset.name, "category": "Gold", "value": val})
            asset_allocation["gold"] += val
        elif category == "mutual_funds":
            buckets[2].assets.append({"name": asset.name, "category": "Mutual Funds", "value": val})
            asset_allocation["equity"] += val
            monthly_passive_income += (val * equity_yield) / 12
        else:
            buckets[2].assets.append({"name": asset.name, "category": category.replace("_", " ").title(), "value": val})
            asset_allocation["other"] += val
            
    # Process Stocks
    for holding in portfolio_state.holdings:
        val = (holding.current_price or holding.avg_price) * holding.quantity
        if holding.asset_class in ["us_equity", "US_EQUITY"]:
            val *= portfolio_state.usd_to_inr
            
        monthly_passive_income += (val * equity_yield) / 12
        asset_allocation["equity"] += val
        
        name_upper = holding.company_name.upper()
        ticker_upper = holding.ticker.upper()
        
        # Check for Liquid funds / Cash
        is_liquid = "LIQUID" in name_upper or "LIQUID" in ticker_upper or holding.asset_class.lower() == "cash"
        
        if is_liquid:
            buckets[1].assets.append({"name": holding.company_name, "category": "Liquid Fund", "value": val})
        # If it's performing poorly (< -10% PnL), put in Bucket 1 to sell first for tax harvesting
        elif holding.pnl_percent is not None and holding.pnl_percent < -10.0:
            buckets[1].assets.append({"name": holding.company_name, "category": "Underperforming Stock", "value": val})
        else:
            buckets[2].assets.append({"name": holding.company_name, "category": "Stock", "value": val})

    # Sort bucket assets by value descending
    for b in buckets.values():
        b.assets.sort(key=lambda x: x["value"], reverse=True)

    recommendations = []
    
    # Gap Analysis
    if total_corpus > 0:
        real_estate_pct = (asset_allocation["real_estate"] / total_corpus) * 100
        equity_pct = (asset_allocation["equity"] / total_corpus) * 100
        debt_pct = (asset_allocation["debt"] / total_corpus) * 100
        
        if real_estate_pct > 60:
            recommendations.append(f"🚨 Your portfolio is highly illiquid ({real_estate_pct:.1f}% in Real Estate). Consider directing future investments towards liquid equity mutual funds or debt instruments.")
            
        if equity_pct < 20:
            recommendations.append(f"⚠️ Low equity exposure (currently {equity_pct:.1f}%). To beat inflation during a long retirement, consider increasing your equity allocation to at least 30-40%.")
            
        if debt_pct < 10:
            recommendations.append(f"💡 Low fixed-income allocation ({debt_pct:.1f}%). Consider building a larger fixed-income or debt cushion to protect against market downturns during your initial retirement years.")
            
    if total_corpus < target_corpus * 0.5:
        recommendations.append(f"📈 You are less than 50% towards your target corpus of ₹{target_corpus/10000000:,.2f} Cr. Focus on maximizing SIPs and PPF contributions.")
    elif total_corpus >= target_corpus:
        recommendations.append("🎉 Congratulations! You have reached your target retirement corpus.")

    return RetirementPlan(
        total_corpus=total_corpus,
        target_corpus=target_corpus,
        estimated_monthly_passive_income=monthly_passive_income,
        withdrawal_strategy=list(buckets.values()),
        recommendations=recommendations
    )
