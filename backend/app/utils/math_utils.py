from typing import List, Tuple
from datetime import datetime

def calculate_xirr(cashflows: List[Tuple[datetime, float]], guess: float = 0.1, tol: float = 1e-5, max_iter: int = 100) -> float:
    """
    Calculate the Internal Rate of Return (IRR) for a schedule of cash flows.
    cashflows: list of tuples (date, amount)
    """
    if len(cashflows) < 2:
        return None
        
    cashflows = sorted(cashflows, key=lambda x: x[0])
    t0 = cashflows[0][0]
    
    # Check if we have both positive and negative cashflows
    amounts = [cf[1] for cf in cashflows]
    if max(amounts) <= 0 or min(amounts) >= 0:
        return None
        
    def npv(rate: float) -> float:
        if rate <= -1.0:
            return float('inf')
        return sum(cf / ((1.0 + rate) ** ((d - t0).days / 365.0)) for d, cf in cashflows)
        
    def dnpv(rate: float) -> float:
        if rate <= -1.0:
            return float('-inf')
        return sum(cf * (-(d - t0).days / 365.0) / ((1.0 + rate) ** (((d - t0).days / 365.0) + 1.0)) for d, cf in cashflows)
        
    r = guess
    for _ in range(max_iter):
        f = npv(r)
        if abs(f) < tol:
            return r
        df = dnpv(r)
        if abs(df) < 1e-8:
            break
        r_new = r - f / df
        if r_new <= -1.0:
            r = r / 2.0
        else:
            r = r_new
            
    # If we didn't converge within max_iter, return None
    return None
