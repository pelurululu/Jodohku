"""
JODOHKU — routes_auth.py
OTP dihantar melalui EMAIL (Gmail SMTP) instead of WhatsApp

  POST /auth/register          → {user_id, access_token}
  POST /auth/email/request-otp → {status, message}
  POST /auth/email/verify-otp  → {user_id, access_token, tier, name}
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import random, string, re, logging, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.database import get_db, User, OTPRecord, Subscription, PioneerStats
from app.config import settings
from app.crm import build_registration_payload, fire_to_makecom

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

def _send_email_otp(email: str, otp_code: str, name: str = ""):
    if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
        logger.warning(f"[OTP] Email not configured — OTP for {email}: {otp_code}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Kod OTP Jodohku: {otp_code}"
        msg["From"] = f"Jodohku <{settings.EMAIL_USER}>"
        msg["To"] = email
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#c8963e">Jodohku</h2>
            <p>Assalamualaikum{' ' + name if name else ''},</p>
            <p>Kod OTP anda adalah:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
                <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#c8963e">{otp_code}</span>
            </div>
            <p style="color:#666;font-size:13px">Kod ini sah selama <strong>5 minit</strong>. Jangan kongsikan kod ini.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:11px">© 2026 Jodohku — Platform Perkahwinan Halal</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, email, msg.as_string())
        logger.info(f"[OTP] Email dihantar ke {email}")
    except Exception as e:
        logger.error(f"[OTP] Gagal hantar email ke {email}: {e}")

def _send_email_welcome(email: str, name: str):
    if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Selamat Datang ke Jodohku!"
        msg["From"] = f"Jodohku <{settings.EMAIL_USER}>"
        msg["To"] = email
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#c8963e">Selamat Datang ke Jodohku!</h2>
            <p>Assalamualaikum <strong>{name}</strong>,</p>
            <p>Akaun anda telah berjaya didaftarkan.</p>
            <ul>
                <li>Lengkapkan profil anda</li>
                <li>Lakukan ujian psikometrik</li>
                <li>Mula mencari jodoh yang sesuai</li>
            </ul>
            <p style="color:#c8963e"><strong>Semoga Allah permudahkan urusan anda.</strong></p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:11px">© 2026 Jodohku — Platform Perkahwinan Halal</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, email, msg.as_string())
        logger.info(f"[WELCOME] Email dihantar ke {email}")
    except Exception as e:
        logger.error(f"[WELCOME] Gagal hantar email: {e}")


class RegisterBody(BaseModel):
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
    income: str = ""

class OTPRequestBody(BaseModel):
    phone_number: str
    email: Optional[str] = ""

class OTPVerifyBody(BaseModel):
    phone_number: str
    otp_code: str


@router.post("/auth/register")
async def register(data: RegisterBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone)
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise HTTPException(409, detail="Nombor telefon ini sudah berdaftar.")
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
        photo_url="", income_class=data.income,
        tier="Silver (7-Hari)", is_premium=True,
    )
    db.add(user)
    db.flush()

    sub = Subscription(
        user_id=user.id, tier="Silver (7-Hari)", status="Trial",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=settings.PIONEER_TRIAL_DAYS),
    )
    db.add(sub)

    pioneer = db.query(PioneerStats).first()
    if pioneer and pioneer.claimed < pioneer.total_quota:
        pioneer.claimed += 1
        user.is_pioneer = True

    db.commit()

    crm_payload = build_registration_payload({
        "full_name": data.name, "phone": phone, "age": data.age,
        "gender": data.gender, "status": data.status,
        "state": data.state, "email": data.email,
        "income_class": data.income, "tier": "Silver (7-Hari)",
        "created_at": datetime.utcnow().isoformat(),
    })
    bg.add_task(fire_to_makecom, crm_payload, settings.MAKE_WEBHOOK_URL)
    if data.email:
        bg.add_task(_send_email_welcome, data.email, data.name)

    logger.info(f"[REG] {data.name} ({uid}) berdaftar.")
    return {"user_id": uid, "access_token": f"tok_{user.id}_{_gen_otp()}"}


@router.post("/auth/email/request-otp")
async def request_otp(data: OTPRequestBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone_number)
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(404, detail="Akaun tidak ditemui. Sila daftar dahulu.")

    email = data.email or user.email
    if not email:
        raise HTTPException(400, detail="Tiada email dalam akaun anda.")

    # Rate limit: max 10 per hour (unused OTPs only)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db.query(OTPRecord).filter(
        OTPRecord.phone == phone,
        OTPRecord.created_at >= one_hour_ago,
        OTPRecord.is_used == False
    ).count()
    if recent >= 10:
        raise HTTPException(429, detail="Terlalu banyak percubaan. Cuba lagi dalam 1 jam.")

    # Invalidate all previous unused OTPs
    db.query(OTPRecord).filter(
        OTPRecord.phone == phone,
        OTPRecord.is_used == False
    ).update({"is_used": True})
    db.commit()

    otp_code = _gen_otp()
    record = OTPRecord(phone=phone, otp_code=otp_code)
    db.add(record)
    db.commit()

    bg.add_task(_send_email_otp, email, otp_code, user.full_name)
    logger.info(f"[OTP] Kod {otp_code} dijana untuk {phone} → {email}")

    return {
        "status": "Success",
        "message": f"OTP dihantar ke {email}.",
        "debug_otp": otp_code if settings.DEBUG else None
    }


@router.post("/auth/email/verify-otp")
async def verify_otp(data: OTPVerifyBody, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone_number)
    otp = data.otp_code.strip()

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
        "msg_count": user.msg_count,
    }


# Backward compat — old WhatsApp routes redirect to email
@router.post("/auth/whatsapp/request-otp")
async def request_otp_compat(data: OTPRequestBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    return await request_otp(data, bg, db)

@router.post("/auth/whatsapp/verify-otp")
async def verify_otp_compat(data: OTPVerifyBody, db: Session = Depends(get_db)):
    return await verify_otp(data, db)


# ═══════════════════════════════════════════════════
#  EMAIL-BASED LOGIN (no phone needed)
#  Frontend: doOTP() and doVerify() now use email
# ═══════════════════════════════════════════════════

class EmailOTPRequestBody(BaseModel):
    email: str

class EmailOTPVerifyBody(BaseModel):
    email: str
    otp_code: str


@router.post("/auth/email/request-otp-by-email")
async def request_otp_by_email(data: EmailOTPRequestBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, detail="Emel tidak dijumpai. Sila daftar dahulu.")

    # Rate limit
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db.query(OTPRecord).filter(
        OTPRecord.phone == user.phone, OTPRecord.created_at >= one_hour_ago
    ).count()
    if recent >= 5:
        raise HTTPException(429, detail="Terlalu banyak percubaan. Cuba lagi dalam 1 jam.")

    otp_code = _gen_otp()
    record = OTPRecord(phone=user.phone, otp_code=otp_code)
    db.add(record)
    db.commit()

    bg.add_task(_send_email_otp, email, otp_code, user.full_name)
    logger.info(f"[OTP-EMAIL] Kod {otp_code} dijana untuk {email}")

    return {
        "status": "Success",
        "message": f"OTP dihantar ke {email}.",
        "debug_otp": otp_code if settings.DEBUG else None
    }


@router.post("/auth/email/verify-otp-by-email")
async def verify_otp_by_email(data: EmailOTPVerifyBody, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp = data.otp_code.strip()

    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, detail="Emel tidak dijumpai.")

    # Verify OTP using phone (OTP stored by phone)
    record = db.query(OTPRecord).filter(
        OTPRecord.phone == user.phone, OTPRecord.otp_code == otp,
        OTPRecord.is_used == False, OTPRecord.expires_at >= datetime.utcnow()
    ).order_by(OTPRecord.created_at.desc()).first()

    if not record:
        raise HTTPException(401, detail="OTP tidak sah atau telah tamat tempoh.")

    record.is_used = True
    user.last_active = datetime.utcnow()
    db.commit()

    return {
        "user_id": user.uid,
        "access_token": f"tok_{user.id}_{_gen_otp()}",
        "tier": user.tier,
        "name": user.full_name,
        "msg_count": user.msg_count,
    }