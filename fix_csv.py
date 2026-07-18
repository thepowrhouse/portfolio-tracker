import pandas as pd
from datetime import datetime
import io

def test_sort():
    data = """symbol,quantity,price,type,date
HBLENGINE,122,546,SELL,2025-01-22
HBLENGINE,120,458,BUY,2025-02-27
HBLENGINE,24,790,SELL,2026-04-15
HBLENGINE,4,842,BUY,2026-05-11
"""
    df = pd.read_csv(io.StringIO(data))
    
    # parse dates
    def parse_dt(d):
        try:
            return datetime.strptime(d, "%Y-%m-%d")
        except:
            return datetime.min
            
    df['parsed_date'] = df['date'].apply(parse_dt)
    df = df.sort_values('parsed_date')
    print(df)

test_sort()
