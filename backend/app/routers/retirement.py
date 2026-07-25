from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from datetime import datetime
from app.models import RetirementPlan, WithdrawalBucket
from app.routers.portfolio import verify_access, get_portfolio_state

router = APIRouter(prefix="/retirement", tags=["retirement"])

@router.get("/plan", response_model=RetirementPlan)
async def get_retirement_plan(
    target_corpus: float = 100000000.0,
    real_estate_yield: float = 0.08,
    debt_yield: float = 0.07,
    equity_yield: float = 0.12,
    epf_yield: float = 0.081,
    ppf_yield: float = 0.071,
    nps_yield: float = 0.10,
    gold_yield: float = 0.10,
    savings_yield: float = 0.03,
    dob: str = "1990-01-01",
    monthly_expenses: float = 100000.0,
    lifespan: int = 85,
    inflation_rate: float = 0.06,
    email: str = Depends(verify_access)
):
    # Fetch the complete portfolio state using the existing function
    portfolio_state = await get_portfolio_state(force=False, email=email)
    
    total_corpus = portfolio_state.net_worth_inr
    
    monthly_passive_income = 0.0
    
    buckets: Dict[int, WithdrawalBucket] = {
        1: WithdrawalBucket(bucket_name="Bucket 1: Immediate Liquidity (Years 1-3)", priority=1, description="Cash, Savings, Liquid Funds. Use this to cover your living expenses without touching volatile investments during market crashes.", assets=[]),
        2: WithdrawalBucket(bucket_name="Bucket 2: Medium-Term Stability (Years 4-7)", priority=2, description="Debt Funds, Bonds, Gold. These outpace inflation with moderate risk. As Bucket 1 depletes, sell from here to refill it.", assets=[]),
        3: WithdrawalBucket(bucket_name="Bucket 3: Long-Term Growth (Years 8-15+)", priority=3, description="Equity Mutual Funds, Stocks. The growth engine of your retirement. Leave untouched to compound aggressively.", assets=[]),
        4: WithdrawalBucket(bucket_name="Bucket 4: Illiquid / Tax-Sheltered (Hold)", priority=4, description="Real Estate, EPF, PPF, NPS. Only sell as a last resort or upon maturity. Real Estate provides rental income.", assets=[])
    }
    
    asset_allocation = {"equity": 0, "debt": 0, "real_estate": 0, "gold": 0, "cash": 0, "other": 0}
    bucket_totals = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}
    
    # Process Other Assets
    for asset in portfolio_state.other_assets:
        val = asset.value
        if asset.currency == "USD":
            val *= portfolio_state.usd_to_inr
            
        category = asset.category.value if hasattr(asset.category, "value") else asset.category
        
        if category == "real_estate":
            monthly_passive_income += (val * real_estate_yield) / 12
            buckets[4].assets.append({"name": asset.name, "category": "Real Estate", "value": val})
            asset_allocation["real_estate"] += val
            bucket_totals[4] += val
        elif category in ["epf", "ppf", "nps"]:
            if category == "epf":
                monthly_passive_income += (val * epf_yield) / 12
            elif category == "ppf":
                monthly_passive_income += (val * ppf_yield) / 12
            elif category == "nps":
                monthly_passive_income += (val * nps_yield) / 12
            buckets[4].assets.append({"name": asset.name, "category": category.upper(), "value": val})
            asset_allocation["debt"] += val
            bucket_totals[4] += val
        elif category in ["fixed_income", "bonds"]:
            monthly_passive_income += (val * debt_yield) / 12
            buckets[2].assets.append({"name": asset.name, "category": "Bonds / FD", "value": val})
            asset_allocation["debt"] += val
            bucket_totals[2] += val
        elif category == "gold":
            monthly_passive_income += (val * gold_yield) / 12
            buckets[2].assets.append({"name": asset.name, "category": "Gold", "value": val})
            asset_allocation["gold"] += val
            bucket_totals[2] += val
        elif category == "savings_bank":
            monthly_passive_income += (val * savings_yield) / 12
            buckets[1].assets.append({"name": asset.name, "category": "Savings Account", "value": val})
            asset_allocation["cash"] += val
            bucket_totals[1] += val
        elif category == "mutual_funds":
            monthly_passive_income += (val * equity_yield) / 12
            # Assuming most MFs here are equity unless named liquid
            if "liquid" in asset.name.lower() or "debt" in asset.name.lower():
                buckets[1].assets.append({"name": asset.name, "category": "Liquid/Debt Fund", "value": val})
                asset_allocation["debt"] += val
                bucket_totals[1] += val
            else:
                buckets[3].assets.append({"name": asset.name, "category": "Equity MF", "value": val})
                asset_allocation["equity"] += val
                bucket_totals[3] += val
        else:
            buckets[2].assets.append({"name": asset.name, "category": category.replace("_", " ").title(), "value": val})
            asset_allocation["other"] += val
            bucket_totals[2] += val
            
    # Process Stocks
    has_losses = False
    for holding in portfolio_state.holdings:
        val = (holding.current_price or holding.avg_price) * holding.quantity
        if holding.asset_class in ["us_equity", "US_EQUITY"]:
            val *= portfolio_state.usd_to_inr
            
        monthly_passive_income += (val * equity_yield) / 12
        
        name_upper = holding.company_name.upper()
        ticker_upper = holding.ticker.upper()
        
        is_liquid = "LIQUID" in name_upper or "LIQUID" in ticker_upper or holding.asset_class.lower() == "cash"
        
        if is_liquid:
            buckets[1].assets.append({"name": holding.company_name, "category": "Liquid ETF", "value": val})
            asset_allocation["cash"] += val
            bucket_totals[1] += val
        else:
            buckets[3].assets.append({"name": holding.company_name, "category": "Direct Stock", "value": val})
            asset_allocation["equity"] += val
            bucket_totals[3] += val
            
            if holding.pnl_percent is not None and holding.pnl_percent < -15.0:
                has_losses = True

    # Sort bucket assets by value descending
    for b in buckets.values():
        b.assets.sort(key=lambda x: x["value"], reverse=True)

    # Calculate Age & Lifespan
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
        current_age = (datetime.utcnow() - birth_date).days // 365
    except:
        current_age = 35

    years_to_live = max(1, lifespan - current_age)
    years_to_retirement = max(0, 60 - current_age) # Assuming standard retirement age 60 for analysis

    # Drawing Capacity Calculation (PMT)
    blended_yield = (monthly_passive_income * 12) / total_corpus if total_corpus > 0 else 0
    real_rate = max(-0.02, ((1 + blended_yield) / (1 + inflation_rate)) - 1)
    
    monthly_real_rate = real_rate / 12
    total_months = years_to_live * 12
    
    if monthly_real_rate == 0:
        drawing_capacity_per_month = total_corpus / total_months if total_months else 0
    else:
        r = monthly_real_rate
        n = total_months
        drawing_capacity_per_month = total_corpus * (r * (1 + r)**n) / ((1 + r)**n - 1) if n else 0
        
    financial_independence_status = "On Track"
    if drawing_capacity_per_month > monthly_expenses * 1.5:
        financial_independence_status = "Achieved (Abundant)"
    elif drawing_capacity_per_month >= monthly_expenses:
        financial_independence_status = "Achieved"
    elif drawing_capacity_per_month < monthly_expenses * 0.5:
        financial_independence_status = "Shortfall"
        
    # Generate Verbose Recommendations
    recommendations = []
    
    if financial_independence_status in ["Achieved", "Achieved (Abundant)"]:
        recommendations.append(f"🌟 **Financial Independence Achieved!** Based on your expected lifespan of {lifespan} years, your current corpus of ₹{total_corpus/10000000:,.2f} Cr can safely yield ₹{drawing_capacity_per_month:,.0f} every month, adjusting for inflation. This exceeds your configured monthly expenses of ₹{monthly_expenses:,.0f}.")
    elif financial_independence_status == "Shortfall":
        gap = monthly_expenses - drawing_capacity_per_month
        recommendations.append(f"⚠️ **Retirement Gap Identified.** If you retired today, your safe drawing capacity would be limited to ₹{drawing_capacity_per_month:,.0f}/mo. To hit your lifestyle goal of ₹{monthly_expenses:,.0f}/mo, you need to either aggressively increase your SIPs to bridge the ₹{gap:,.0f}/mo gap, or delay your retirement.")
    else:
        recommendations.append(f"📈 **You are On Track.** Your portfolio can safely support ₹{drawing_capacity_per_month:,.0f}/mo. While not fully covering your expenses yet, compounding will likely close this gap as you continue to work.")

    # Liquidity Buffer Analysis (3 Years)
    required_bucket1_buffer = monthly_expenses * 36
    if bucket_totals[1] < required_bucket1_buffer:
        shortfall = required_bucket1_buffer - bucket_totals[1]
        recommendations.append(f"💧 **Sequence of Returns Risk:** Your Bucket 1 (Immediate Liquidity) has ₹{bucket_totals[1]/100000:,.1f}L, but a safe 3-year buffer requires ₹{required_bucket1_buffer/100000:,.1f}L. In a prolonged market crash, you might be forced to sell equities at a severe loss to fund your life. Strategy: Shift ₹{shortfall/100000:,.1f}L from Bucket 2 (Debt) or Bucket 3 (Equity) into liquid funds over the next few months.")
    else:
        recommendations.append(f"🛡️ **Strong Liquidity Buffer:** You hold ₹{bucket_totals[1]/100000:,.1f}L in Bucket 1, comfortably covering over 3 years of expenses. This guarantees that you won't have to touch your equities during a bear market.")
        
    # Asset Allocation Analysis
    if total_corpus > 0:
        real_estate_pct = (asset_allocation["real_estate"] / total_corpus) * 100
        equity_pct = (asset_allocation["equity"] / total_corpus) * 100
        
        if real_estate_pct > 50:
            recommendations.append(f"🧱 **Illiquidity Warning:** {real_estate_pct:.1f}% of your wealth is locked in Real Estate (Bucket 4). Real Estate is notoriously difficult to liquidate in pieces during retirement emergencies. Strategy: Direct all new investments strictly into financial assets (Mutual Funds/Bonds) to dilute this concentration.")
            
        if equity_pct < 30 and years_to_retirement > 10:
            recommendations.append(f"🐢 **Under-exposed to Growth:** Only {equity_pct:.1f}% of your portfolio is in Equity (Bucket 3). Since your retirement could last 25+ years, inflation will severely erode your purchasing power. Strategy: Increase equity allocation to at least 40-50% to ensure the portfolio outlives you.")
            
    # Tax Loss Harvesting
    if has_losses:
        recommendations.append(f"✂️ **Tax-Loss Harvesting Opportunity:** You hold direct stocks in Bucket 3 that are down over 15%. Strategy: Sell these losing positions to offset any capital gains tax liabilities on your profitable investments, then immediately reinvest the proceeds into similar broad-market index funds to maintain your equity exposure.")
        
    if years_to_retirement <= 3 and years_to_retirement > 0:
         recommendations.append(f"🛬 **Retirement Glide Path:** You are within 3 years of retirement! Strategy: Stop reinvesting dividends into equities. Start redirecting all yields and new savings to slowly bulk up Bucket 1 and Bucket 2. Do not take on any new aggressive equity positions.")

    return RetirementPlan(
        total_corpus=total_corpus,
        target_corpus=target_corpus,
        estimated_monthly_passive_income=monthly_passive_income,
        drawing_capacity_per_month=drawing_capacity_per_month,
        monthly_expenses=monthly_expenses,
        current_age=current_age,
        years_to_live=years_to_live,
        financial_independence_status=financial_independence_status,
        withdrawal_strategy=list(buckets.values()),
        recommendations=recommendations
    )
