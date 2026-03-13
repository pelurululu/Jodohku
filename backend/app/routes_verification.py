"""
JODOHKU — routes_verification.py

Mualaf, Asnaf & IC Admin endpoints.

Frontend calls:
  POST /mualaf/apply                    → {status: 'pending'}
  POST /asnaf/apply                     → {status: 'pending'}
  POST /admin/login                     → {token}
  GET  /admin/pending-ic                → {items: [...]}
  GET  /admin/pending-mualaf            → {items: [...]}
  GET  /admin/pending-asnaf             → {items: [...]}
  POST /admin/ic/{uid}/approve          → {ok: true}
  POST /admin/ic/{uid}/reject           → {ok: true}
  POST /admin/mualaf/{id}/approve       → {ok: true}
  POST /admin/mualaf/{id}/reject        → {ok: true}
  POST /admin/asnaf/{id}/approve        → {ok: true}
  POST /admin/asnaf/{id}/reject         → {ok: true}
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging, secrets

from app.database import get_db, User, Base, SessionLocal
from app.config import settings

router = APIRouter()
logger = logging.getLogger("jodohku.verification")

VALID_ASNAF_CATS = ["Fakir","Miskin","Amil","Muallaf","Riqab","Gharimin","Fisabilillah","Ibn Sabil"]


# ═══════════════════════════════════════════
#  ORM MODELS
# ═══════════════════════════════════════════

class MualafApplication(Base):
    __tablename__ = "mualaf_applications"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_uid        = Column(String(20), index=True)
    full_name       = Column(String(100))
    ic_number       = Column(String(20))
    masuk_islam_date= Column(String(10))
    mosque_name     = Column(String(100))
    ustaz_name      = Column(String(100))
    notes           = Column(Text)
    sijil_url       = Column(Text)          # base64 or Supabase URL
    supporting_doc_url = Column(Text)
    status          = Column(String(20), default="pending")   # pending|approved|rejected
    admin_note      = Column(Text)
    reviewed_at     = Column(DateTime)
    submitted_at    = Column(DateTime, default=datetime.utcnow)


class AsnafApplication(Base):
    __tablename__ = "asnaf_applications"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_uid        = Column(String(20), index=True)
    asnaf_category  = Column(String(30))
    full_name       = Column(String(100))
    ic_number       = Column(String(20))
    monthly_income  = Column(Numeric(10, 2))
    dependents      = Column(Integer, default=0)
    debt_amount     = Column(Numeric(12, 2))
    notes           = Column(Text)
    doc_url         = Column(Text)
    bank_statement_url = Column(Text)
    status          = Column(String(20), default="pending")
    admin_note      = Column(Text)
    reviewed_at     = Column(DateTime)
    submitted_at    = Column(DateTime, default=datetime.utcnow)


def init_verification_tables():
    """Call this from main.py lifespan."""
    Base.metadata.create_all(bind=SessionLocal.kw["bind"])


# ═══════════════════════════════════════════
#  SCHEMAS
# ═══════════════════════════════════════════

class MualafApplyBody(BaseModel):
    user_uid: str
    full_name: str
    ic_number: str
    masuk_islam_date: Optional[str] = None
    mosque_name: Optional[str] = None
    ustaz_name: Optional[str] = None
    notes: Optional[str] = None
    sijil_b64: str
    doc_b64: Optional[str] = None

class AsnafApplyBody(BaseModel):
    user_uid: str
    asnaf_category: str
    full_name: str
    ic_number: str
    monthly_income: Optional[float] = None
    dependents: Optional[int] = 0
    debt_amount: Optional[float] = None
    notes: Optional[str] = None
    doc_b64: str
    bank_b64: Optional[str] = None

class AdminLoginBody(BaseModel):
    password: str

class AdminActionBody(BaseModel):
    admin_note: Optional[str] = ""


# ═══════════════════════════════════════════
#  ADMIN AUTH HELPER
# ═══════════════════════════════════════════

def _verify_admin(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(401, detail="Tiada token admin.")
    token = authorization.replace("Bearer ", "")
    expected = getattr(settings, "ADMIN_TOKEN_CACHE", "")
    if not expected or not secrets.compare_digest(token, expected):
        raise HTTPException(401, detail="Token admin tidak sah.")
    return token


# ═══════════════════════════════════════════
#  POST /admin/login
# ═══════════════════════════════════════════

# In-memory token store (simple — restarts clear it, which is fine)
_admin_tokens: set = set()

@router.post("/admin/login")
async def admin_login(data: AdminLoginBody):
    admin_pw = getattr(settings, "ADMIN_PASSWORD", "admin123jodohku")
    if data.password != admin_pw:
        raise HTTPException(401, detail="Kata laluan salah.")
    token = secrets.token_hex(32)
    _admin_tokens.add(token)
    return {"token": token, "msg": "Admin login berjaya"}

def _check_admin(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(401, detail="Tiada token admin.")
    token = authorization.replace("Bearer ", "")
    if token not in _admin_tokens:
        raise HTTPException(401, detail="Token admin tidak sah atau telah tamat.")


# ═══════════════════════════════════════════
#  POST /mualaf/apply
# ═══════════════════════════════════════════

@router.post("/mualaf/apply")
async def mualaf_apply(data: MualafApplyBody, db: Session = Depends(get_db)):
    if not data.full_name or not data.ic_number or not data.sijil_b64:
        raise HTTPException(400, detail="Medan wajib tidak lengkap.")

    # Check existing pending/approved
    existing = db.query(MualafApplication).filter(
        MualafApplication.user_uid == data.user_uid,
        MualafApplication.status.in_(["pending", "approved"])
    ).first()
    if existing:
        msg = "Permohonan anda telah diluluskan." if existing.status == "approved" else "Permohonan sedang dalam semakan."
        raise HTTPException(409, detail=msg)

    app = MualafApplication(
        user_uid        = data.user_uid,
        full_name       = data.full_name,
        ic_number       = data.ic_number,
        masuk_islam_date= data.masuk_islam_date,
        mosque_name     = data.mosque_name,
        ustaz_name      = data.ustaz_name,
        notes           = data.notes,
        sijil_url       = "[base64_stored]" if data.sijil_b64 else None,
        supporting_doc_url = "[base64_stored]" if data.doc_b64 else None,
        status          = "pending",
    )
    db.add(app)

    # Update user status
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if user:
        try: user.mualaf_verified = "pending"
        except: pass

    db.commit()
    logger.info(f"[MUALAF] ✅ Permohonan dari {data.user_uid} diterima.")
    return {"status": "pending", "msg": "Permohonan Mualaf diterima. Semakan dalam 3-5 hari bekerja."}


# ═══════════════════════════════════════════
#  POST /asnaf/apply
# ═══════════════════════════════════════════

@router.post("/asnaf/apply")
async def asnaf_apply(data: AsnafApplyBody, db: Session = Depends(get_db)):
    if data.asnaf_category not in VALID_ASNAF_CATS:
        raise HTTPException(400, detail="Kategori asnaf tidak sah.")
    if not data.full_name or not data.ic_number or not data.doc_b64:
        raise HTTPException(400, detail="Medan wajib tidak lengkap.")

    existing = db.query(AsnafApplication).filter(
        AsnafApplication.user_uid == data.user_uid,
        AsnafApplication.status.in_(["pending", "approved"])
    ).first()
    if existing:
        msg = "Permohonan anda telah diluluskan." if existing.status == "approved" else "Permohonan sedang dalam semakan."
        raise HTTPException(409, detail=msg)

    app = AsnafApplication(
        user_uid        = data.user_uid,
        asnaf_category  = data.asnaf_category,
        full_name       = data.full_name,
        ic_number       = data.ic_number,
        monthly_income  = data.monthly_income,
        dependents      = data.dependents or 0,
        debt_amount     = data.debt_amount,
        notes           = data.notes,
        doc_url         = "[base64_stored]" if data.doc_b64 else None,
        bank_statement_url = "[base64_stored]" if data.bank_b64 else None,
        status          = "pending",
    )
    db.add(app)

    user = db.query(User).filter(User.uid == data.user_uid).first()
    if user:
        try:
            user.asnaf_verified = "pending"
            user.asnaf_category = data.asnaf_category
        except: pass

    db.commit()
    logger.info(f"[ASNAF] ✅ Permohonan {data.asnaf_category} dari {data.user_uid} diterima.")
    return {"status": "pending", "msg": f"Permohonan Asnaf ({data.asnaf_category}) diterima."}


# ═══════════════════════════════════════════
#  ADMIN — GET PENDING LISTS
# ═══════════════════════════════════════════

@router.get("/admin/pending-ic")
async def pending_ic(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    rows = db.query(User).filter(User.ic_verified == "pending").all()
    items = [{
        "id": u.uid,
        "user_uid": u.uid,
        "full_name": u.full_name,
        "email": u.email,
        "doc_url": u.ic_photo_url if hasattr(u, "ic_photo_url") else None,
        "submitted_at": u.created_at.isoformat() if u.created_at else None,
    } for u in rows]
    return {"items": items, "count": len(items)}


@router.get("/admin/pending-mualaf")
async def pending_mualaf(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    rows = db.query(MualafApplication).filter(MualafApplication.status == "pending").order_by(MualafApplication.submitted_at.asc()).all()
    items = [{
        "id": r.id,
        "user_uid": r.user_uid,
        "full_name": r.full_name,
        "ic_number": r.ic_number,
        "masuk_islam_date": r.masuk_islam_date,
        "mosque_name": r.mosque_name,
        "ustaz_name": r.ustaz_name,
        "notes": r.notes,
        "doc_url": r.sijil_url,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
    } for r in rows]
    return {"items": items, "count": len(items)}


@router.get("/admin/pending-asnaf")
async def pending_asnaf(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    rows = db.query(AsnafApplication).filter(AsnafApplication.status == "pending").order_by(AsnafApplication.submitted_at.asc()).all()
    items = [{
        "id": r.id,
        "user_uid": r.user_uid,
        "asnaf_category": r.asnaf_category,
        "full_name": r.full_name,
        "ic_number": r.ic_number,
        "monthly_income": float(r.monthly_income) if r.monthly_income else None,
        "dependents": r.dependents,
        "debt_amount": float(r.debt_amount) if r.debt_amount else None,
        "notes": r.notes,
        "doc_url": r.doc_url,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
    } for r in rows]
    return {"items": items, "count": len(items)}


# ═══════════════════════════════════════════
#  ADMIN — APPROVE / REJECT
# ═══════════════════════════════════════════

@router.post("/admin/ic/{uid}/approve")
async def approve_ic(uid: str, data: AdminActionBody, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    user = db.query(User).filter(User.uid == uid).first()
    if not user: raise HTTPException(404, detail="Pengguna tidak ditemui.")
    user.ic_verified = "approved"
    user.is_verified = True
    db.commit()
    logger.info(f"[IC] ✅ {uid} diluluskan.")
    return {"ok": True, "status": "approved"}


@router.post("/admin/ic/{uid}/reject")
async def reject_ic(uid: str, data: AdminActionBody, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    user = db.query(User).filter(User.uid == uid).first()
    if not user: raise HTTPException(404, detail="Pengguna tidak ditemui.")
    user.ic_verified = "rejected"
    try: user.ic_reject_reason = data.admin_note
    except: pass
    db.commit()
    logger.info(f"[IC] ✕ {uid} ditolak.")
    return {"ok": True, "status": "rejected"}


@router.post("/admin/mualaf/{id}/approve")
async def approve_mualaf(id: int, data: AdminActionBody, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    app = db.query(MualafApplication).filter(MualafApplication.id == id).first()
    if not app: raise HTTPException(404, detail="Permohonan tidak ditemui.")
    app.status = "approved"; app.admin_note = data.admin_note; app.reviewed_at = datetime.utcnow()
    user = db.query(User).filter(User.uid == app.user_uid).first()
    if user:
        try: user.mualaf_verified = "approved"
        except: pass
    db.commit()
    return {"ok": True, "status": "approved"}


@router.post("/admin/mualaf/{id}/reject")
async def reject_mualaf(id: int, data: AdminActionBody, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    app = db.query(MualafApplication).filter(MualafApplication.id == id).first()
    if not app: raise HTTPException(404, detail="Permohonan tidak ditemui.")
    app.status = "rejected"; app.admin_note = data.admin_note; app.reviewed_at = datetime.utcnow()
    user = db.query(User).filter(User.uid == app.user_uid).first()
    if user:
        try: user.mualaf_verified = "rejected"
        except: pass
    db.commit()
    return {"ok": True, "status": "rejected"}


@router.post("/admin/asnaf/{id}/approve")
async def approve_asnaf(id: int, data: AdminActionBody, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    app = db.query(AsnafApplication).filter(AsnafApplication.id == id).first()
    if not app: raise HTTPException(404, detail="Permohonan tidak ditemui.")
    app.status = "approved"; app.admin_note = data.admin_note; app.reviewed_at = datetime.utcnow()
    user = db.query(User).filter(User.uid == app.user_uid).first()
    if user:
        try: user.asnaf_verified = "approved"
        except: pass
    db.commit()
    return {"ok": True, "status": "approved"}


@router.post("/admin/asnaf/{id}/reject")
async def reject_asnaf(id: int, data: AdminActionBody, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    app = db.query(AsnafApplication).filter(AsnafApplication.id == id).first()
    if not app: raise HTTPException(404, detail="Permohonan tidak ditemui.")
    app.status = "rejected"; app.admin_note = data.admin_note; app.reviewed_at = datetime.utcnow()
    user = db.query(User).filter(User.uid == app.user_uid).first()
    if user:
        try: user.asnaf_verified = "rejected"
        except: pass
    db.commit()
    return {"ok": True, "status": "rejected"}


# ═══════════════════════════════════════════
#  ADMIN STATS (counts for dashboard header)
# ═══════════════════════════════════════════

@router.get("/admin/verification-stats")
async def verification_stats(db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    _check_admin(authorization)
    ic_count     = db.query(User).filter(User.ic_verified == "pending").count()
    mualaf_count = db.query(MualafApplication).filter(MualafApplication.status == "pending").count()
    asnaf_count  = db.query(AsnafApplication).filter(AsnafApplication.status == "pending").count()
    return {"ic": ic_count, "mualaf": mualaf_count, "asnaf": asnaf_count}
