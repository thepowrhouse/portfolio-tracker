"""
CSV Parser for Zerodha, Groww, and INDmoney formats.
Each parser normalizes to the CSVHolding model.
"""

import pandas as pd
import io
import re
from typing import List
from collections import defaultdict
from datetime import datetime
from app.models import CSVHolding, BrokerType, AssetClass, CashFlow
from app.utils.ticker_map import resolve_ticker, get_ticker_from_isin

class CSVParseError(Exception):
    pass

def clean_number(val) -> float:
    if pd.isna(val) or val is None:
        return 0.0
    s = str(val).replace(",", "").strip()
    s = re.sub(r'[^\d.-]', '', s)
    return float(s) if s else 0.0

def parse_zerodha_csv(file_bytes: bytes) -> List[CSVHolding]:
    """
    Zerodha Console CSV format:
    Typically has columns: Symbol, ISIN, Quantity, Avg. Cost, LTP, etc.
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise CSVParseError(f"Failed to read Zerodha CSV: {e}")
    
    # Zerodha column normalization
    col_map = {
        "symbol": "Symbol",
        "isin": "ISIN",
        "quantity": "Quantity",
        "avg_cost": "Avg. Cost",
        "ltp": "LTP",
    }
    
    # Find actual columns (case-insensitive)
    actual_cols = {c.lower().strip(): c for c in df.columns}
    
    symbol_col = actual_cols.get("symbol") or actual_cols.get("tradingsymbol") or actual_cols.get("instrument")
    qty_col = actual_cols.get("quantity") or actual_cols.get("qty") or actual_cols.get("qty.")
    avg_col = actual_cols.get("avg. cost") or actual_cols.get("avg cost") or actual_cols.get("average cost")
    
    if not symbol_col or not qty_col:
        raise CSVParseError(f"Could not find required columns (Symbol/Instrument, Quantity) in Zerodha CSV. Found columns: {list(df.columns)}")
    
    holdings = []
    for _, row in df.iterrows():
        try:
            ticker = str(row[symbol_col]).strip().upper()
            qty = clean_number(row[qty_col])
            avg_price = clean_number(row[avg_col]) if avg_col else 0.0
            
            if qty <= 0:
                continue
                
            ticker = get_ticker_from_isin(ticker)
            company_name, _ = resolve_ticker(ticker)
            asset_class = AssetClass.INDIAN_EQUITY
            
            holdings.append(CSVHolding(
                ticker=ticker,
                company_name=company_name,
                quantity=qty,
                avg_price=avg_price,
                broker=BrokerType.ZERODHA,
                asset_class=asset_class
            ))
        except (ValueError, TypeError):
            continue
    
    return holdings

def parse_groww_csv(file_bytes: bytes) -> List[CSVHolding]:
    """
    Groww Holdings CSV format:
    Typically has: Stock Name, Ticker, Quantity, Avg Price, etc.
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise CSVParseError(f"Failed to read Groww CSV: {e}")
    
    actual_cols = {c.lower().strip(): c for c in df.columns}
    
    is_order_history = "execution date and time" in actual_cols
    
    if is_order_history:
        return _parse_groww_order_history(df, actual_cols)
        
    ticker_col = actual_cols.get("ticker") or actual_cols.get("symbol") or actual_cols.get("stock") or actual_cols.get("instrument name") or actual_cols.get("isin")
    qty_col = actual_cols.get("quantity") or actual_cols.get("qty") or actual_cols.get("shares")
    avg_col = actual_cols.get("avg price") or actual_cols.get("average price") or actual_cols.get("buy price") or actual_cols.get("average buy price")
    name_col = actual_cols.get("stock name") or actual_cols.get("company name") or actual_cols.get("instrument name")
    
    if not ticker_col or not qty_col:
        raise CSVParseError(f"Could not find required columns in Groww CSV. Found: {list(df.columns)}")
    
    holdings = []
    for _, row in df.iterrows():
        try:
            ticker = str(row[ticker_col]).strip().upper()
            qty = clean_number(row[qty_col])
            avg_price = clean_number(row[avg_col]) if avg_col else 0.0
            
            if qty <= 0:
                continue
            
            ticker = get_ticker_from_isin(ticker)
            company_name, _ = resolve_ticker(ticker)
            asset_class = AssetClass.INDIAN_EQUITY
            # If Groww CSV has explicit name, use it
            if name_col and pd.notna(row[name_col]):
                company_name = str(row[name_col]).strip()
            
            holdings.append(CSVHolding(
                ticker=ticker,
                company_name=company_name,
                quantity=qty,
                avg_price=avg_price,
                broker=BrokerType.GROWW,
                asset_class=asset_class
            ))
        except (ValueError, TypeError):
            continue
    
    return holdings

def _parse_groww_order_history(df: pd.DataFrame, actual_cols: dict) -> List[CSVHolding]:
    symbol_col = actual_cols.get("symbol") or actual_cols.get("ticker") or actual_cols.get("isin")
    qty_col = actual_cols.get("quantity") or actual_cols.get("qty")
    value_col = actual_cols.get("value")
    type_col = actual_cols.get("type")
    date_col = actual_cols.get("execution date and time")
    status_col = actual_cols.get("order status")
    name_col = actual_cols.get("stock name")
    
    if not symbol_col or not date_col or not value_col:
        raise CSVParseError(f"Missing required columns in Groww Order History. Found: {list(df.columns)}")
        
    class AggHolding:
        def __init__(self, name):
            self.name = name
            self.qty = 0.0
            self.invested = 0.0
            self.cashflows = []
            
    agg_map = {}
    
    for _, row in df.iterrows():
        try:
            status = str(row[status_col]).strip().lower() if status_col else "executed"
            if "executed" not in status and "success" not in status:
                continue
                
            ticker = str(row[symbol_col]).strip().upper()
            if not ticker:
                continue
                
            qty = clean_number(row[qty_col])
            val = clean_number(row[value_col])
            t_type = str(row[type_col]).strip().upper()
            
            # 13-12-2021 09:15 AM
            date_str = str(row[date_col]).strip()
            try:
                dt = datetime.strptime(date_str, "%d-%m-%Y %I:%M %p")
            except ValueError:
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S") # fallback
                
            if ticker not in agg_map:
                name = str(row[name_col]).strip() if name_col else ticker
                agg_map[ticker] = AggHolding(name)
                
            agg = agg_map[ticker]
            
            if t_type == "BUY":
                agg.qty += qty
                agg.invested += val
                agg.cashflows.append(CashFlow(date=dt, amount=-val))
            elif t_type == "SELL":
                # For average price approximation, if they sell, we reduce invested proportionately
                if agg.qty > 0:
                    avg_cost_before = agg.invested / agg.qty
                    agg.invested = max(0.0, agg.invested - (qty * avg_cost_before))
                agg.qty = max(0.0, agg.qty - qty)
                agg.cashflows.append(CashFlow(date=dt, amount=val))
                
        except Exception:
            continue
            
    holdings = []
    for ticker, agg in agg_map.items():
        if agg.qty > 0.001:
            final_ticker = get_ticker_from_isin(ticker)
            company_name, _ = resolve_ticker(final_ticker)
            if agg.name and final_ticker == ticker:
                company_name = agg.name
                
            avg_price = agg.invested / agg.qty if agg.qty > 0 else 0.0
            
            holdings.append(CSVHolding(
                ticker=final_ticker,
                company_name=company_name,
                quantity=agg.qty,
                avg_price=avg_price,
                broker=BrokerType.GROWW,
                asset_class=AssetClass.INDIAN_EQUITY,
                cashflows=agg.cashflows,
                is_order_history=True
            ))
            
    return holdings

def parse_indmoney_csv(file_bytes: bytes) -> List[CSVHolding]:
    """
    INDmoney Portfolio CSV format:
    Typically has: Stock, Ticker, Units, Average Cost, etc.
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise CSVParseError(f"Failed to read INDmoney CSV: {e}")
    
    actual_cols = {c.lower().strip(): c for c in df.columns}
    
    ticker_col = actual_cols.get("ticker") or actual_cols.get("symbol") or actual_cols.get("stock") or actual_cols.get("source_holding_id")
    qty_col = actual_cols.get("units") or actual_cols.get("quantity") or actual_cols.get("shares") or actual_cols.get("total units")
    avg_col = actual_cols.get("average cost") or actual_cols.get("avg cost") or actual_cols.get("buy price")
    invested_amt_col = actual_cols.get("invested amount")
    xirr_col = actual_cols.get("xirr (%)") or actual_cols.get("xirr")
    
    if not ticker_col or not qty_col:
        raise CSVParseError(f"Could not find required columns in INDmoney CSV. Found columns: {list(df.columns)}")
    
    holdings = []
    for _, row in df.iterrows():
        try:
            ticker_raw = str(row[ticker_col]).strip().upper()
            if "US_STOCK" in ticker_raw:
                ticker = ticker_raw.split('_')[-1]
            else:
                ticker = ticker_raw

            qty = clean_number(row[qty_col])
            
            if qty <= 0:
                continue
                
            avg_price = 0.0
            if avg_col:
                avg_price = clean_number(row[avg_col])
            elif invested_amt_col:
                invested_amt = clean_number(row[invested_amt_col])
                avg_price = invested_amt / qty
            
            ticker = get_ticker_from_isin(ticker)
            company_name, _ = resolve_ticker(ticker)
            
            # If there's an explicit investment name, use it
            inv_col = actual_cols.get("investment")
            if inv_col and pd.notna(row[inv_col]):
                company_name = str(row[inv_col]).strip()

            asset_class = AssetClass.US_EQUITY
            
            xirr = None
            if xirr_col and pd.notna(row[xirr_col]):
                try:
                    xirr_str = str(row[xirr_col]).strip().replace('%', '')
                    if xirr_str != '-' and xirr_str != '':
                        xirr = float(xirr_str)
                except Exception:
                    pass
            
            holdings.append(CSVHolding(
                ticker=ticker,
                company_name=company_name,
                quantity=qty,
                avg_price=avg_price,
                broker=BrokerType.INDMONEY,
                asset_class=asset_class,
                xirr=xirr
            ))
        except (ValueError, TypeError) as e:
            with open("indmoney_debug.log", "a") as f:
                f.write(f"Skipped row: {e} | {row.to_dict()}\n")
            continue
            
    if len(holdings) == 0:
        with open("indmoney_debug.log", "a") as f:
            f.write(f"Parsed 0 holdings. Columns were: {list(df.columns)}\n")
    
    return holdings

def parse_csv_by_broker(file_bytes: bytes, broker: BrokerType) -> List[CSVHolding]:
    """Router to the correct parser based on broker type."""
    if broker == BrokerType.ZERODHA:
        return parse_zerodha_csv(file_bytes)
    elif broker == BrokerType.GROWW:
        return parse_groww_csv(file_bytes)
    elif broker == BrokerType.INDMONEY:
        return parse_indmoney_csv(file_bytes)
    elif broker == BrokerType.RSU:
        # RSU is manual entry, not CSV
        return []
    else:
        raise CSVParseError(f"Unknown broker type: {broker}")