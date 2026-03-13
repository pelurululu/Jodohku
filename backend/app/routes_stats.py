"""
JODOHKU — routes_stats.py

  Baris 1073: loadPioneer() → fetch(API+'/stats/pioneer-quota')
              Frontend expect: {remaining: number}
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db, PioneerStats, User, Match, ChatMessage

router = APIRouter()


@router.get("/stats/pioneer-quota")
async def pioneer_quota(db: Session = Depends(get_db)):
    """
    Frontend baris 1073: loadPioneer()
    Frontend baris 1820 (dalam versi lama): d.remaining
    """
    stats = db.query(PioneerStats).first()
    remaining = (stats.total_quota - stats.claimed) if stats else 3000
    return {
        "remaining": remaining,
        "total": stats.total_quota if stats else 3000,
        "claimed": stats.claimed if stats else 0,
    }


@router.get("/admin/stats")
async def admin_stats(db: Session = Depends(get_db)):
    """Statistik untuk admin dashboard."""
    return {
        "total_users": db.query(User).count(),
        "premium_users": db.query(User).filter(User.is_premium == True).count(),
        "total_matches": db.query(Match).count(),
        "total_messages": db.query(ChatMessage).count(),
        "pioneer_claimed": (db.query(PioneerStats).first() or PioneerStats()).claimed,
    }
