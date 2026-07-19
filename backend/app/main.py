from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import portfolio, analysis, sectors, admin, activity
from app.db import init_db

app = FastAPI(
    title="Portfolio Tracker API",
    description="Multi-broker portfolio tracking with AI recommendations",
    version="1.0.0"
)

import os

# Allow configurable origins, default to wildcard for easy deployment
origins_env = os.getenv("ALLOWED_ORIGINS")
origins = origins_env.split(",") if origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router)
app.include_router(analysis.router)
app.include_router(sectors.router)
app.include_router(admin.router)
app.include_router(activity.router)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/health")
async def health():
    return {"status": "ok"}