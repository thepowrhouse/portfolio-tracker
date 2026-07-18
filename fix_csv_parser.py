import re

with open('backend/app/services/csv_parser.py', 'r') as f:
    content = f.read()

def replace_parser(func_name, broker, asset_class, date_parse_logic, val_logic, extra_name_logic=""):
    global content
    
    pattern = r'(?<=def ' + func_name + r'\(df: pd\.DataFrame, actual_cols: dict\) -> List\[CSVHolding\]:\n)(.*?)(?=\n\s+return holdings)'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"Could not find {func_name}")
        return
        
    old_body = match.group(1)
    
    # We will replace everything after the initial column extraction down to the return
    col_extract = re.search(r'(.*?)(?=\s+class AggHolding:)', old_body, re.DOTALL).group(1)
    
    new_body = col_extract + f"""    class AggHolding:
        def __init__(self, name):
            self.name = name
            self.qty = 0.0
            self.invested = 0.0
            self.cashflows = []
            self.has_buy = False
            self.invalid_cashflows = False
            
    agg_map = {{}}
    transactions = []
    
    for _, row in df.iterrows():
        try:
            status = str(row.get(actual_cols.get("order status", ""), "")).strip().lower()
            if status and "executed" not in status and "success" not in status:
                continue

            ticker = str(row[symbol_col]).strip().upper()
            if not ticker:
                continue
                
            qty = clean_number(row[qty_col])
{val_logic}
            t_type = str(row[type_col]).strip().upper()
            
            date_str = str(row[date_col]).strip()
{date_parse_logic}
            
{extra_name_logic}
            
            transactions.append((dt, ticker, qty, val, t_type, name))
        except Exception:
            continue
            
    transactions.sort(key=lambda x: x[0])
    
    for dt, ticker, qty, val, t_type, name in transactions:
        if ticker not in agg_map:
            agg_map[ticker] = AggHolding(name)
            
        agg = agg_map[ticker]
        
        if t_type == "BUY":
            agg.has_buy = True
            agg.qty += qty
            agg.invested += val
            agg.cashflows.append(CashFlow(date=dt, amount=-val))
        elif t_type == "SELL":
            if not agg.has_buy:
                agg.invalid_cashflows = True
            if agg.qty > 0:
                avg_cost_before = agg.invested / agg.qty
                agg.invested = max(0.0, agg.invested - (qty * avg_cost_before))
            agg.qty = max(0.0, agg.qty - qty)
            agg.cashflows.append(CashFlow(date=dt, amount=val))
            
    holdings = []
    for ticker, agg in agg_map.items():
        if agg.qty > 0.0001:
            final_ticker = get_ticker_from_isin(ticker)
            from backend.app.services.ticker_resolver import resolve_ticker
            company_name, _ = resolve_ticker(final_ticker)
            if agg.name and final_ticker == ticker:
                company_name = agg.name
                
            avg_price = agg.invested / agg.qty if agg.qty > 0 else 0.0
            
            holdings.append(CSVHolding(
                ticker=final_ticker,
                company_name=company_name,
                quantity=agg.qty,
                avg_price=avg_price,
                broker=BrokerType.{broker},
                asset_class=AssetClass.{asset_class},
                cashflows=[] if agg.invalid_cashflows else agg.cashflows,
                is_order_history=True
            ))"""
            
    content = content.replace(old_body, new_body)

# ZERODHA
z_date = """            try:
                dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                dt = datetime.strptime(date_str, "%Y-%m-%d")"""
z_val = """            price = clean_number(row[price_col])
            val = qty * price"""
replace_parser("_parse_zerodha_tradebook", "ZERODHA", "INDIAN_EQUITY", z_date, z_val, "            name = ticker")

# GROWW
g_date = """            try:
                dt = datetime.strptime(date_str, "%d-%m-%Y %I:%M %p")
            except ValueError:
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")"""
g_val = """            val = clean_number(row[value_col])"""
g_name = """            name = str(row[name_col]).strip() if name_col else ticker"""
replace_parser("_parse_groww_order_history", "GROWW", "INDIAN_EQUITY", g_date, g_val, g_name)

# INDMONEY
i_date = """            try:
                dt = datetime.strptime(date_str, "%d %b %Y, %I:%M %p")
            except ValueError:
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")"""
i_val = """            price = clean_number(row[price_col])
            val = qty * price"""
i_name = """            name = str(row[name_col]).strip() if name_col else ticker"""
replace_parser("_parse_indmoney_order_history", "INDMONEY", "US_EQUITY", i_date, i_val, i_name)

with open('backend/app/services/csv_parser.py', 'w') as f:
    f.write(content)
