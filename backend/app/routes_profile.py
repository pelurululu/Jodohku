"""
JODOHKU — routes_profile.py

Frontend calls:
  GET  /user/{uid}/profile          → full profile object
  PUT  /user/{uid}/profile          → update education, occupation, etc
  POST /user/{uid}/upload-photo     → base64 photo
  POST /profile/upload-ic           → IC verification (NEW — called by submitIC() in profile.js)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging, base64, os, uuid

from app.database import get_db, User
from app.config import settings

router = APIRouter()
logger = logging.getLogger("jodohku.profile")


# ═══════════════════════════════════════════════════
#  GET /user/{uid}/profile
# ═══════════════════════════════════════════════════
@router.get("/user/{uid}/profile")
async def get_profile(uid: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    return {
        "uid": user.uid,
        "full_name": user.full_name,
        "dob": user.dob,
        "age": user.age,
        "gender": user.gender,
        "status": user.status,
        "state": user.state_residence,
        "email": user.email,
        "tier": user.tier,
        "is_premium": user.is_premium,
        "msg_count": user.msg_count,
        "photo_url": user.photo_url,
        "education": user.education or "",
        "occupation": user.occupation or "",
        "income_class": user.income_class or "",
        "wingman_verdict": user.wingman_verdict or "",
        "psy_done": user.psy_done,
        "psy_score": user.psy_score,
        "psy_type": user.psy_type,
        "psy_desc": user.psy_desc,
        "psy_traits": user.psy_traits or [],
        "psy_dims": user.psy_dims or {},
        "psy_custom_text": user.psy_custom_text,
        # ic_verified maps to S.icVerified on frontend
        "ic_verified": user.ic_verified if hasattr(user, 'ic_verified') else (True if user.is_verified else False),
        "is_verified": user.is_verified,
        "is_pioneer": user.is_pioneer,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


# ═══════════════════════════════════════════════════
#  PUT /user/{uid}/profile
# ═══════════════════════════════════════════════════
class ProfileUpdateBody(BaseModel):
    education: Optional[str] = None
    occupation: Optional[str] = None
    income_class: Optional[str] = None
    photo_url: Optional[str] = None
    psy_custom_text: Optional[str] = None
    wingman_verdict: Optional[str] = None

@router.put("/user/{uid}/profile")
async def update_profile(uid: str, data: ProfileUpdateBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    if data.education is not None: user.education = data.education
    if data.occupation is not None: user.occupation = data.occupation
    if data.income_class is not None: user.income_class = data.income_class
    if data.photo_url is not None: user.photo_url = data.photo_url
    if data.psy_custom_text is not None: user.psy_custom_text = data.psy_custom_text[:500]
    if data.wingman_verdict is not None: user.wingman_verdict = data.wingman_verdict[:1000]

    db.commit()
    return {"status": "Success", "message": "Profil dikemaskini."}


# ═══════════════════════════════════════════════════
#  POST /user/{uid}/upload-photo
# ═══════════════════════════════════════════════════
class PhotoUploadBody(BaseModel):
    photo_base64: str

@router.post("/user/{uid}/upload-photo")
async def upload_photo(uid: str, data: PhotoUploadBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")
    if len(data.photo_base64) > 7_000_000:
        raise HTTPException(400, detail="Saiz gambar melebihi 5MB.")

    # [PRODUCTION] Decode & upload to S3/Supabase, store URL
    # See commented block below. For now: store truncated for DB safety.
    user.photo_url = data.photo_base64[:200] + "..."
    db.commit()
    return {"status": "Success", "photo_url": user.photo_url}


# ═══════════════════════════════════════════════════
#  POST /profile/upload-ic
#  Called by profile.js submitIC()
#  Body: { user_uid, ic_image: base64_string }
#  Returns: { status, ic_verified: "pending" }
# ═══════════════════════════════════════════════════
class ICUploadBody(BaseModel):
    user_uid: str
    ic_image: str   # raw base64 (no data:image/... prefix)

@router.post("/profile/upload-ic")
async def upload_ic(data: ICUploadBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    if not data.ic_image or len(data.ic_image) < 100:
        raise HTTPException(400, detail="Gambar IC tidak sah.")

    if len(data.ic_image) > 7_000_000:
        raise HTTPException(400, detail="Saiz gambar melebihi 5MB.")

    # ════════════════════════════════════
    # [PRODUCTION] Save IC image for manual admin review:
    #
    # Option A — save to disk (temp):
    # ic_dir = "/tmp/jodohku_ic"
    # os.makedirs(ic_dir, exist_ok=True)
    # filename = f"{data.user_uid}_{uuid.uuid4().hex[:8]}.jpg"
    # with open(os.path.join(ic_dir, filename), "wb") as f:
    #     f.write(base64.b64decode(data.ic_image))
    #
    # Option B — upload to Supabase Storage:
    # import httpx
    # binary = base64.b64decode(data.ic_image)
    # filename = f"ic/{data.user_uid}/{uuid.uuid4().hex}.jpg"
    # resp = await httpx.AsyncClient().put(
    #     f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_IC_BUCKET}/{filename}",
    #     headers={"Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    #              "Content-Type": "image/jpeg"},
    #     content=binary
    # )
    # ════════════════════════════════════

    # Mark IC as pending verification
    # If User model has ic_verified column use it, otherwise use a flag approach
    try:
        user.ic_verified = "pending"
    except AttributeError:
        pass  # column may not exist yet — add migration below

    # Also clear is_verified until admin confirms
    # user.is_verified = False  # uncomment if you want strict flow

    db.commit()
    logger.info(f"[IC] IC diterima untuk {data.user_uid} — menunggu semakan admin.")

    return {
        "status": "Success",
        "ic_verified": "pending",
        "message": "IC diterima. Pengesahan dalam masa 1–24 jam.",
    }


# ═══════════════════════════════════════════════════
#  POST /profile/verify-ic/{uid}  — Admin endpoint
#  Admin marks IC as verified after manual check
# ═══════════════════════════════════════════════════
class ICVerifyBody(BaseModel):
    approved: bool
    admin_note: Optional[str] = ""

@router.post("/profile/verify-ic/{uid}")
async def admin_verify_ic(uid: str, data: ICVerifyBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    if data.approved:
        user.is_verified = True
        try:
            user.ic_verified = True
        except AttributeError:
            pass
        logger.info(f"[IC] ✅ {uid} disahkan oleh admin.")
    else:
        user.is_verified = False
        try:
            user.ic_verified = False
        except AttributeError:
            pass
        logger.info(f"[IC] ❌ {uid} ditolak oleh admin. Sebab: {data.admin_note}")

    db.commit()
    return {"status": "Success", "uid": uid, "is_verified": user.is_verified}