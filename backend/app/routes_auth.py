"""
JODOHKU — routes_auth.py
Endpoint auth TEPAT mengikut frontend apiCall():

  Baris 743: apiCall('POST','/auth/register', {phone,name,dob,age,gender,status,email,state,ic4,tnc_agreed,photo})
             → Response: {user_id, access_token}

  Baris 749: apiCall('POST','/auth/whatsapp/request-otp', {phone_number})
             → Response: success

  Baris 751: apiCall('POST','/auth/whatsapp/verify-otp', {phone_number,otp_code})
             → Response: {user_id, access_token, tier, name}
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional
import random, string, re, logging

from app.database import get_db, User, OTPRecord, Subscription, PioneerStats
from app.config import settings
from app.crm import build_registration_payload, fire_to_makecom, send_whatsapp_otp, send_whatsapp_welcome

router = APIRouter()
logger = logging.getLogger("jodohku.auth")


def _gen_uid():
    return "JDK-" + ''.join(random.choices(string.digits, k=5))

def _gen_otp():
    return ''.join(random.choices(string.digits, k=6))

def _clean_phone(p: str) -> str:
    p = re.sub(r"[\s\-\(\)\+]", "", p)
    if p.startswith("60"): p = "0" + p[2:]
    if not p.startswith("0"): p = "0" + p
    return p


# ═══════════════════════════════════════════════════
#  Skema — TEPAT mengikut body yang frontend hantar
# ═══════════════════════════════════════════════════

class RegisterBody(BaseModel):
    """Frontend baris 743: body yang dihantar ke /auth/register"""
    phone: str
    name: str
    dob: str = ""
    age: int = 0
    gender: str = "Lelaki"
    status: str = "Bujang"
    email: str = ""
    state: str = ""
    ic4: str = ""
    tnc_agreed: bool = True
    photo: Optional[str] = None
    # Progressive profile — dari regStep1 (S._regData.income)
    income: str = ""   # B40/M40/T20/VVIP

class OTPRequestBody(BaseModel):
    """Frontend baris 749"""
    phone_number: str

class OTPVerifyBody(BaseModel):
    """Frontend baris 751"""
    phone_number: str
    otp_code: str


# ═══════════════════════════════════════════════════
#  POST /auth/register
#  Frontend baris 743: regFinal()
#  Response: {user_id, access_token}
# ═══════════════════════════════════════════════════
@router.post("/auth/register")
async def register(data: RegisterBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone)

    # Semak duplikasi
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise HTTPException(409, detail="Nombor telefon ini sudah berdaftar.")

    # Validasi asas
    if len(data.name.strip()) < 2:
        raise HTTPException(400, detail="Nama terlalu pendek.")
    if data.age < 18 or data.age > 55:
        raise HTTPException(400, detail="Umur mestilah 18-55 tahun.")

    uid = _gen_uid()
    user = User(
        uid=uid, phone=phone, full_name=data.name.strip(),
        dob=data.dob, age=data.age, gender=data.gender,
        status=data.status, email=data.email,
        state_residence=data.state, ic_last4=data.ic4,
        photo_url="",
        income_class=data.income,  # B40/M40/T20/VVIP dari registration step 1
        tier="Silver (7-Hari)", is_premium=True,
    )
    db.add(user)
    db.flush()

    # Subscription — Pioneer 7 hari trial
    sub = Subscription(
        user_id=user.id, tier="Silver (7-Hari)", status="Trial",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=settings.PIONEER_TRIAL_DAYS),
    )
    db.add(sub)

    # Pioneer counter
    pioneer = db.query(PioneerStats).first()
    if pioneer and pioneer.claimed < pioneer.total_quota:
        pioneer.claimed += 1
        user.is_pioneer = True

    db.commit()

    # ══════════════════════════════════════════
    # CRM: Tembak payload ke Make.com (background)
    # [DEVELOPER] Uncomment bila Make.com sudah siap
    # ══════════════════════════════════════════
    crm_payload = build_registration_payload({
        "full_name": data.name, "phone": phone, "age": data.age,
        "gender": data.gender, "status": data.status,
        "state": data.state, "email": data.email,
        "income_class": data.income,
        "tier": "Silver (7-Hari)",
        "created_at": datetime.utcnow().isoformat(),
    })
    bg.add_task(fire_to_makecom, crm_payload, settings.MAKE_WEBHOOK_URL)
    bg.add_task(send_whatsapp_welcome, phone, data.name, settings.WHATSAPP_TOKEN, settings.WHATSAPP_PHONE_ID)

    logger.info(f"[REG] ✅ {data.name} ({uid}) berdaftar.")

    # Response TEPAT macam frontend expect (baris 743):
    #   S.uid = data.user_id
    #   S.tok = data.access_token
    return {
        "user_id": uid,
        "access_token": f"tok_{user.id}_{_gen_otp()}",
    }


# ═══════════════════════════════════════════════════
#  POST /auth/whatsapp/request-otp
#  Frontend baris 749: doOTP()
# ═══════════════════════════════════════════════════
@router.post("/auth/whatsapp/request-otp")
async def request_otp(data: OTPRequestBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone_number)

    # Rate limit: max 5 per jam
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db.query(OTPRecord).filter(
        OTPRecord.phone == phone, OTPRecord.created_at >= one_hour_ago
    ).count()
    if recent >= 5:
        raise HTTPException(429, detail="Terlalu banyak percubaan. Cuba lagi dalam 1 jam.")

    otp_code = _gen_otp()
    record = OTPRecord(phone=phone, otp_code=otp_code)
    db.add(record)
    db.commit()

    # Hantar OTP via WhatsApp (background)
    bg.add_task(send_whatsapp_otp, phone, otp_code, settings.WHATSAPP_TOKEN, settings.WHATSAPP_PHONE_ID)

    logger.info(f"[OTP] Kod {otp_code} dijana untuk {phone}")

    return {"status": "Success", "message": f"OTP dihantar ke {phone}.", "debug_otp": otp_code if settings.DEBUG else None  # Only shown when DEBUG=true}


# ═══════════════════════════════════════════════════
#  POST /auth/whatsapp/verify-otp
#  Frontend baris 751: doVerify()
#  Response: {user_id, access_token, tier, name}
# ═══════════════════════════════════════════════════
@router.post("/auth/whatsapp/verify-otp")
async def verify_otp(data: OTPVerifyBody, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone_number)
    otp = data.otp_code.strip()

    # OTP verification
    record = db.query(OTPRecord).filter(
        OTPRecord.phone == phone, OTPRecord.otp_code == otp,
        OTPRecord.is_used == False, OTPRecord.expires_at >= datetime.utcnow()
    ).order_by(OTPRecord.created_at.desc()).first()

    if not record:
        raise HTTPException(401, detail="OTP tidak sah atau telah tamat tempoh.")

    record.is_used = True
    db.commit()

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(404, detail="Akaun tidak ditemui.")

    user.last_active = datetime.utcnow()
    db.commit()

    return {
        "user_id": user.uid,
        "access_token": f"tok_{user.id}_{_gen_otp()}",
        "tier": user.tier,
        "name": user.full_name,
    }
