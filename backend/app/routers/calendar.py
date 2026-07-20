from fastapi import APIRouter, Depends
from typing import List

from app.models import CalendarEvent
from app.routers.portfolio import _portfolio_db, verify_access
from app.services.calendar import get_upcoming_earnings, get_macro_events

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/events", response_model=List[CalendarEvent])
async def get_all_events(email: str = Depends(verify_access)):
    """
    Fetch both earnings events for the user's portfolio and global macro events.
    Returns them as a combined list.
    """
    from fastapi import HTTPException
    import traceback
    try:
        user_portfolio = _portfolio_db.get(email, [])
        
        # Get events
        earnings_events = get_upcoming_earnings(user_portfolio) if user_portfolio else []
        macro_events = get_macro_events()
        
        # Combine and sort by date ascending
        all_events = earnings_events + macro_events
        all_events.sort(key=lambda x: x.date)
        
        return all_events
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
