"""
CRITICAL: Reconciliation Logic
This module implements the strict sync-overwrite strategy:
1. If stock exists in DB but NOT in CSV → DELETE
2. If stock exists in CSV but NOT in DB → ADD
3. If stock exists in both but qty changed → UPDATE
"""

from typing import List, Dict
from app.models import CSVHolding, PortfolioHolding, BrokerType
import uuid
from datetime import datetime

class Reconciler:
    def __init__(self, current_holdings: List[PortfolioHolding]):
        # Index by composite key: (ticker, broker)
        self.current_map: Dict[str, PortfolioHolding] = {
            f"{h.ticker}:{h.broker.value}": h for h in current_holdings
        }
    
    def reconcile(self, csv_holdings: List[CSVHolding], broker: BrokerType) -> List[PortfolioHolding]:
        """
        STRICT MIRROR of CSV state for the SPECIFIC broker.
        Holdings from other brokers are preserved unchanged.
        """
        # Handle order history flag: only update cashflows without deleting
        if csv_holdings and getattr(csv_holdings[0], 'is_order_history', False):
            broker_existing = [h for h in self.current_map.values() if h.broker == broker]
            if not broker_existing:
                raise ValueError(f"Please upload your {broker.value.title()} Holdings Snapshot CSV first before uploading the Order History/Tradebook CSV for XIRR computation.")
                
            new_map = {h.ticker: h for h in csv_holdings}
            for existing in self.current_map.values():
                if existing.broker == broker and existing.ticker in new_map:
                    order_h = new_map[existing.ticker]
                    existing.cashflows = order_h.cashflows
                    
                    # Compute the true native average price using the raw invested amount
                    # from the order history, but keep the split-adjusted quantity from holdings.
                    invested_native = order_h.quantity * order_h.avg_price
                    if existing.quantity > 0:
                        existing.avg_price = round(invested_native / existing.quantity, 4)
                        
            return list(self.current_map.values())

        new_holdings: List[PortfolioHolding] = []
        csv_keys = set()
        
        for csv_h in csv_holdings:
            key = f"{csv_h.ticker}:{csv_h.broker.value}"
            csv_keys.add(key)
            
            existing = self.current_map.get(key)
            
            if existing:
                # UPDATE: Stock exists, check if quantity changed
                if existing.quantity != csv_h.quantity or existing.avg_price != csv_h.avg_price:
                    updated = PortfolioHolding(
                        id=existing.id,
                        ticker=csv_h.ticker,
                        company_name=csv_h.company_name,
                        quantity=csv_h.quantity,
                        avg_price=csv_h.avg_price,
                        current_price=existing.current_price,  # Preserve fetched price
                        broker=csv_h.broker,
                        asset_class=csv_h.asset_class,
                        last_updated=datetime.utcnow(),
                        xirr=csv_h.xirr,
                        cashflows=csv_h.cashflows
                    )
                    new_holdings.append(updated)
                else:
                    # No change, keep existing
                    new_holdings.append(existing)
            else:
                # ADD: Stock in CSV but not in DB
                new_holding = PortfolioHolding(
                    id=str(uuid.uuid4()),
                    ticker=csv_h.ticker,
                    company_name=csv_h.company_name,
                    quantity=csv_h.quantity,
                    avg_price=csv_h.avg_price,
                    current_price=None,
                    broker=csv_h.broker,
                    asset_class=csv_h.asset_class,
                    last_updated=datetime.utcnow(),
                    xirr=csv_h.xirr,
                    cashflows=csv_h.cashflows
                )
                new_holdings.append(new_holding)
        
        # DELETE: Anything in DB but NOT in CSV for the CURRENT broker is implicitly dropped.
        # PRESERVE: Holdings belonging to OTHER brokers.
        for existing in self.current_map.values():
            if existing.broker != broker:
                new_holdings.append(existing)
        
        return new_holdings

def reconcile_portfolio(
    current_holdings: List[PortfolioHolding],
    csv_holdings: List[CSVHolding],
    broker: BrokerType
) -> List[PortfolioHolding]:
    """
    Public interface for portfolio reconciliation.
    """
    reconciler = Reconciler(current_holdings)
    return reconciler.reconcile(csv_holdings, broker)