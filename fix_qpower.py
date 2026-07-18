import re

with open('backend/app/utils/ticker_map.py', 'r') as f:
    content = f.read()

# Add clean_ticker function
new_func = """
def clean_ticker(ticker: str) -> str:
    \"\"\"Removes common exchange suffixes from raw tickers.\"\"\"
    ticker = ticker.strip().upper()
    for suffix in ['-BE', '-BZ', '-EQ', '.NS', '.BO']:
        if ticker.endswith(suffix):
            ticker = ticker[:-len(suffix)]
    return ticker

def get_ticker_from_isin(isin: str) -> str:"""

content = content.replace("def get_ticker_from_isin(isin: str) -> str:", new_func)
with open('backend/app/utils/ticker_map.py', 'w') as f:
    f.write(content)

with open('backend/app/services/csv_parser.py', 'r') as f:
    parser_content = f.read()

parser_content = parser_content.replace(
    "final_ticker = get_ticker_from_isin(ticker)",
    "from app.utils.ticker_map import clean_ticker\n            final_ticker = clean_ticker(get_ticker_from_isin(ticker))"
)
with open('backend/app/services/csv_parser.py', 'w') as f:
    f.write(parser_content)
