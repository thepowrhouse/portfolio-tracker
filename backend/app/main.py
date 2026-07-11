from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import portfolio, analysis, sectors

app = FastAPI(
    title="Portfolio Tracker API",
    description="Multi-broker portfolio tracking with AI recommendations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router)
app.include_router(analysis.router)
app.include_router(sectors.router)

@app.get("/health")
async def health():
    return {"status": "ok"}