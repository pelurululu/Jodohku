"""
JODOHKU — routes_matchmaking.py

  Baris 803: apiCall('GET', `/matchmaking/daily-feed/${S.uid}`)
             Frontend expect: {feed: [{candidate_id, display_name, age, status, tier,
                                       compatibility_score, ai_verdict, traits, photo_url}]}

  Baris 870: apiCall('POST', `/matchmaking/action?user_id=${S.uid}&candidate_id=${cid}&action=${action}`)
             Frontend expect: {status: 'MATCHED', match_id} atau {status: 'RECORDED'}
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
import random, string, logging

from app.database import get_db, User, Match, MatchAction, DailyFeed
from app.ai_engine import calculate_compatibility, generate_ai_verdict
from app.config import settings

router = APIRouter()
logger = logging.getLogger("jodohku.match")


# ═══════════════════════════════════════════════════
#  GET /matchmaking/daily-feed/{uid}
#  Frontend baris 803: loadFeed()
#
#  Frontend mapCandidate() baris 824 expect:
#    {candidate_id, display_name, age, status, tier,
#     compatibility_score, ai_verdict, traits, photo_url}
# ═══════════════════════════════════════════════════
@router.get("/matchmaking/daily-feed/{uid}")
async def daily_feed(uid: str, db: Session = Depends(get_db)):
    # Cari user
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        # Kembalikan senarai kosong jika tiada calon ditemui
        return {"feed": []}

    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Semak cache feed hari ini
    cached = db.query(DailyFeed).filter(
        DailyFeed.user_uid == uid, DailyFeed.feed_date == today
    ).all()

    if cached:
        candidates = []
        for f in cached:
            c = db.query(User).filter(User.uid == f.candidate_uid).first()
            if c:
                candidates.append(_build_candidate(c, f.compatibility_score, f.ai_verdict))
        return {"feed": candidates}

    # Jana feed baru — cari calon berlawanan jantina
    opposite = "Perempuan" if user.gender == "Lelaki" else "Lelaki"
    pool = db.query(User).filter(
        User.uid != uid, User.gender == opposite,
        User.is_active == True, User.is_banned == False,
    ).all()

    # Skor & rank
    scored = []
    for c in pool:
        score = calculate_compatibility(user.psy_dims or {}, c.psy_dims or {})
        # Frontend baris 806-807: hanya papar 80%+
        # Tapi kita simpan semua >= 75% untuk margin
        if score >= 75:
            verdict = generate_ai_verdict(
                user.psy_dims or {}, c.psy_dims or {},
                c.full_name, score
            )
            scored.append({"user": c, "score": score, "verdict": verdict})

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:settings.DAILY_CANDIDATES]

    # Simpan ke DB
    result = []
    for item in top:
        c = item["user"]
        feed = DailyFeed(
            user_uid=uid, candidate_uid=c.uid,
            compatibility_score=item["score"],
            ai_verdict=item["verdict"], feed_date=today,
        )
        db.add(feed)
        result.append(_build_candidate(c, item["score"], item["verdict"]))

    db.commit()
    return {"feed": result}


def _build_candidate(c: User, score: float, verdict: str) -> dict:
    """Format output TEPAT macam frontend mapCandidate() expect (baris 824)."""
    return {
        "candidate_id": c.uid,
        "display_name": f"{c.full_name} (#{c.uid})",
        "age": c.age,
        "status": c.status,
        "tier": c.tier,
        "compatibility_score": round(score, 1),
        "ai_verdict": verdict,
        "traits": c.psy_traits or [],
        "photo_url": c.photo_url or "",
    }


# ═══════════════════════════════════════════════════
#  POST /matchmaking/action?user_id=&candidate_id=&action=
#  Frontend baris 870: doAction()
#
#  Frontend expect response:
#    Jika MATCHED: {status: 'MATCHED', match_id: '...'}
#    Jika biasa:   {status: 'RECORDED'}
# ═══════════════════════════════════════════════════
@router.post("/matchmaking/action")
async def match_action(
    user_id: str = Query(...),
    candidate_id: str = Query(...),
    action: str = Query(...),
    db: Session = Depends(get_db),
):
    # Rekod tindakan
    act = MatchAction(user_id=0, candidate_id=candidate_id, action=action)
    # Resolve user_id string to actual id
    user = db.query(User).filter(User.uid == user_id).first()
    if user:
        act.user_id = user.id
    db.add(act)

    result = {"status": "RECORDED", "action": action}

    if action == "LIKE":
        # Semak mutual like
        candidate = db.query(User).filter(User.uid == candidate_id).first()
        if candidate:
            mutual = db.query(MatchAction).filter(
                MatchAction.user_id == candidate.id,
                MatchAction.candidate_id == user_id,
                MatchAction.action == "LIKE",
            ).first()

            if mutual:
                # MATCH! Cipta padanan
                match_uid = "mid_" + ''.join(random.choices(string.digits, k=10))
                score = calculate_compatibility(
                    user.psy_dims or {} if user else {},
                    candidate.psy_dims or {},
                )
                verdict = generate_ai_verdict(
                    user.psy_dims or {} if user else {},
                    candidate.psy_dims or {},
                    candidate.full_name, score
                )
                match = Match(
                    match_uid=match_uid,
                    user1_id=user.id if user else 0,
                    user2_id=candidate.id,
                    compatibility_score=score,
                    ai_verdict=verdict,
                )
                db.add(match)
                result = {
                    "status": "MATCHED",
                    "match_id": match_uid,
                    "score": score,
                    "match_data": {
                        "match_id": match_uid,
                        "name": f"{candidate.full_name} (#{candidate.uid})",
                        "score": round(score, 1),
                        "verdict": verdict,
                        "photo": candidate.photo_url or None,
                        "traits": candidate.psy_traits or [],
                    }
                }
                logger.info(f"[MATCH] 💫 {user_id} ↔ {candidate_id} ({score:.0f}%)")

    db.commit()
    return result
