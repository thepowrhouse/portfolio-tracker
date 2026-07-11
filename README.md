# Portfolio Tracker

A comprehensive, multi-broker stock portfolio tracking dashboard built with Next.js (frontend) and FastAPI (backend). It features live market data enrichment, fundamental & technical analysis, and dynamic asset allocation breakdowns.

## Features

- **Multi-Broker Support**: Import CSVs from Zerodha, Groww, and INDmoney.
- **Advanced XIRR Calculation**: Compute accurate Internal Rate of Return (XIRR) natively from INDmoney files and Groww Order History files using the Newton-Raphson mathematical method.
- **Live Pricing & P&L**: Fetches real-time stock prices using `yfinance` to display accurate current net worth and unrealized/realized profit & loss.
- **AI Stock Analysis**: Leverages fundamental (P/E, ROE, Debt/Equity), technical (RSI, MACD, Bollinger Bands), and sentiment (News API) data to automatically rate stocks as BUY, HOLD, or SELL.
- **Asset Allocation**: Visual breakdowns of your portfolio by Broker, Asset Class, Sector, and Performance (Profit vs. Loss).

## Tech Stack

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Framework**: FastAPI (Python)
- **Data processing**: Pandas, NumPy
- **Financial APIs**: Yahoo Finance (`yfinance`), NewsAPI
- **Async Execution**: `asyncio` for high-performance concurrent data fetching.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- NewsAPI Key (Optional, for sentiment analysis)

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Usage
1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Select your broker from the dropdown in the import section.
3. Drag and drop your Broker's Holdings Snapshot CSV.
   - *Tip for Groww Users:* Upload your regular Snapshot CSV first to lock in your exact quantities, then upload your Order History CSV to compute your exact XIRR!
4. The dashboard will automatically calculate your live net worth, sector allocation, and run a full technical analysis on your portfolio.
