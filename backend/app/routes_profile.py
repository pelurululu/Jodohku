"""
JODOHKU — routes_profile.py
Endpoint profil pengguna.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging

from app.database import get_db, User
from app.config import settings

router = APIRouter()
logger = logging.getLogger("jodohku.profile")


@router.get("/user/{uid}/profile")
async def get_profile(uid: str, db: Session = Depends(get_db)):
    """Profil lengkap pengguna — semua field yang frontend perlukan."""
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
        # Progressive profile fields (S.education, S.occupation, S.income, S.wingmanVerdict)
        "education": user.education or "",
        "occupation": user.occupation or "",
        "income_class": user.income_class or "",
        "wingman_verdict": user.wingman_verdict or "",
        # Psikometrik
        "psy_done": user.psy_done,
        "psy_score": user.psy_score,
        "psy_type": user.psy_type,
        "psy_desc": user.psy_desc,
        "psy_traits": user.psy_traits or [],
        "psy_dims": user.psy_dims or {},
        "psy_custom_text": user.psy_custom_text,
        "is_verified": user.is_verified,
        "is_pioneer": user.is_pioneer,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


class ProfileUpdateBody(BaseModel):
    education: Optional[str] = None
    occupation: Optional[str] = None
    income_class: Optional[str] = None
    photo_url: Optional[str] = None
    psy_custom_text: Optional[str] = None
    wingman_verdict: Optional[str] = None  # S.wingmanVerdict dari frontend


@router.put("/user/{uid}/profile")
async def update_profile(uid: str, data: ProfileUpdateBody, db: Session = Depends(get_db)):
    """Kemaskini profil — pendidikan, pekerjaan, wingman verdict, dll."""
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    if data.education is not None:
        user.education = data.education
    if data.occupation is not None:
        user.occupation = data.occupation
    if data.income_class is not None:
        user.income_class = data.income_class
    if data.photo_url is not None:
        user.photo_url = data.photo_url
    if data.psy_custom_text is not None:
        user.psy_custom_text = data.psy_custom_text[:500]
    if data.wingman_verdict is not None:
        user.wingman_verdict = data.wingman_verdict[:1000]

    db.commit()
    return {"status": "Success", "message": "Profil dikemaskini."}


# ═══════════════════════════════════════════
#  POST /user/{uid}/upload-photo
#  Frontend hantar base64 melalui S.photo
#  Backend PATUT upload ke S3 dan simpan URL
# ═══════════════════════════════════════════
class PhotoUploadBody(BaseModel):
    photo_base64: str  # data:image/jpeg;base64,...

@router.post("/user/{uid}/upload-photo")
async def upload_photo(uid: str, data: PhotoUploadBody, db: Session = Depends(get_db)):
    """
    Terima gambar base64 dan simpan.
    
    [DEVELOPER] Untuk production:
    1. Decode base64
    2. Upload ke AWS S3 / Supabase
    3. Jana public URL
    4. Simpan URL dalam user.photo_url
    5. Hantar URL ke CRM (Airtable)
    """
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    # Validasi saiz (base64 ~ 33% lebih besar dari binary)
    if len(data.photo_base64) > 7_000_000:  # ~5MB binary
        raise HTTPException(400, detail="Saiz gambar melebihi 5MB.")

    # ══════════════════════════════════════
    # [PRODUCTION] Upload ke S3:
    # ══════════════════════════════════════
    # import base64, boto3, uuid
    # binary = base64.b64decode(data.photo_base64.split(",")[1])
    # filename = f"profiles/{uid}/{uuid.uuid4()}.jpg"
    # s3 = boto3.client("s3", region_name=settings.S3_REGION,
    #     aws_access_key_id=settings.S3_ACCESS_KEY,
    #     aws_secret_access_key=settings.S3_SECRET_KEY)
    # s3.put_object(Bucket=settings.S3_BUCKET, Key=filename,
    #     Body=binary, ContentType="image/jpeg", ACL="public-read")
    # url = f"https://{settings.S3_BUCKET}.s3.{settings.S3_REGION}.amazonaws.com/{filename}"
    # user.photo_url = url

    # Demo: simpan base64 terus (JANGAN buat ini di production)
    user.photo_url = data.photo_base64[:200] + "..."  # Truncate untuk DB
    db.commit()

    return {"status": "Success", "photo_url": user.photo_url}
