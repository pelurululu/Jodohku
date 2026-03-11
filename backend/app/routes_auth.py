"""
JODOHKU — routes_auth.py

Frontend auth.js calls:
  POST /auth/register                           → {user_id, access_token}
  POST /auth/email/request-otp-by-email         → {status}
  POST /auth/email/verify-otp-by-email          → {user_id, access_token, tier, name, msg_count}
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import random, string, re, logging

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


# ═══════════════════════════════════════════════════
#  Schemas
# ═══════════════════════════════════════════════════

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

class EmailOTPRequestBody(BaseModel):
    email: str

class EmailOTPVerifyBody(BaseModel):
    email: str
    otp_code: str


# ═══════════════════════════════════════════════════
#  POST /auth/register
# ═══════════════════════════════════════════════════
@router.post("/auth/register")
async def register(data: RegisterBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    phone = _clean_phone(data.phone)
    email = data.email.strip().lower()

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
        status=data.status, email=email,
        state_residence=data.state, ic_last4=data.ic4,
        photo_url="",
        income_class=data.income,
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
        "state": data.state, "email": email,
        "income_class": data.income,
        "tier": "Silver (7-Hari)",
        "created_at": datetime.utcnow().isoformat(),
    })
    bg.add_task(fire_to_makecom, crm_payload, settings.MAKE_WEBHOOK_URL)

    logger.info(f"[REG] ✅ {data.name} ({uid}) berdaftar.")
    return {
        "user_id": uid,
        "access_token": f"tok_{user.id}_{_gen_otp()}",
    }


# ═══════════════════════════════════════════════════
#  POST /auth/email/request-otp-by-email
#  Frontend auth.js: doOTP() — cari user by email, hantar OTP
# ═══════════════════════════════════════════════════
@router.post("/auth/email/request-otp-by-email")
async def request_otp_by_email(data: EmailOTPRequestBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, detail="Alamat emel tidak sah.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, detail="Emel tidak dijumpai. Sila daftar dahulu.")

    # Rate limit: max 5 per jam per emel
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db.query(OTPRecord).filter(
        OTPRecord.phone == email,  # reuse phone column for email OTPs
        OTPRecord.created_at >= one_hour_ago
    ).count()
    if recent >= 5:
        raise HTTPException(429, detail="Terlalu banyak percubaan. Cuba lagi dalam 1 jam.")

    otp_code = _gen_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    record = OTPRecord(phone=email, otp_code=otp_code, expires_at=expires)
    db.add(record)
    db.commit()

    # Send email OTP (background)
    bg.add_task(_send_email_otp, email, otp_code, user.full_name)

    logger.info(f"[OTP-EMAIL] Kod dijana untuk {email}")
    return {
        "status": "Success",
        "message": f"Kod OTP dihantar ke {email}.",
        # Only expose in DEBUG for testing convenience
        "demo_otp": otp_code if settings.DEBUG else None,
    }


# ═══════════════════════════════════════════════════
#  POST /auth/email/verify-otp-by-email
#  Frontend auth.js: doVerify()
#  Response: {user_id, access_token, tier, name, msg_count}
# ═══════════════════════════════════════════════════
@router.post("/auth/email/verify-otp-by-email")
async def verify_otp_by_email(data: EmailOTPVerifyBody, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp = data.otp_code.strip()

    if not otp or len(otp) != 6:
        raise HTTPException(400, detail="Kod OTP mesti 6 digit.")

    # Debug shortcut
    if settings.DEBUG and otp == "123456":
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.last_active = datetime.utcnow()
            db.commit()
            return _login_response(user)
        raise HTTPException(404, detail="Akaun tidak ditemui.")

    record = db.query(OTPRecord).filter(
        OTPRecord.phone == email,
        OTPRecord.otp_code == otp,
        OTPRecord.is_used == False,
        OTPRecord.expires_at >= datetime.utcnow(),
    ).order_by(OTPRecord.created_at.desc()).first()

    if not record:
        raise HTTPException(401, detail="OTP tidak sah atau telah tamat tempoh.")

    record.is_used = True
    db.commit()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, detail="Akaun tidak ditemui.")

    user.last_active = datetime.utcnow()
    db.commit()

    return _login_response(user)


def _login_response(user):
    return {
        "user_id": user.uid,
        "access_token": f"tok_{user.id}_{_gen_otp()}",
        "tier": user.tier,
        "name": user.full_name,
        "msg_count": user.msg_count,
    }


# ═══════════════════════════════════════════════════
#  Email sender helper (uses SMTP from config)
# ═══════════════════════════════════════════════════
async def _send_email_otp(email: str, otp: str, name: str):
    """Send OTP via Gmail SMTP. Requires EMAIL_* vars in .env"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from app.config import settings

        if not settings.EMAIL_HOST or not settings.EMAIL_USER:
            logger.warning("[EMAIL] EMAIL_HOST/EMAIL_USER tidak dikonfigurasi — OTP tidak dihantar.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Kod Log Masuk Jodohku: {otp}"
        msg["From"] = f"Jodohku <{settings.EMAIL_USER}>"
        msg["To"] = email

        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#05050E;color:#ECEBF8;border-radius:16px">
          <h2 style="color:#C9A84C;font-size:22px;margin-bottom:8px">Jodohku — Log Masuk</h2>
          <p style="color:#9494BC;margin-bottom:24px">Salam {name},</p>
          <p style="margin-bottom:16px">Kod OTP anda untuk log masuk:</p>
          <div style="background:#15152B;border:1px solid rgba(201,168,76,.25);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#C9A84C">{otp}</span>
          </div>
          <p style="color:#5A5A80;font-size:12px">Kod ini sah selama 10 minit. Jangan kongsi kod ini dengan sesiapa.</p>
          <p style="color:#5A5A80;font-size:11px;margin-top:16px">© 2026 Asas Technologies (M) Sdn Bhd</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, email, msg.as_string())

        logger.info(f"[EMAIL] OTP dihantar ke {email}")
    except Exception as e:
        logger.error(f"[EMAIL] Gagal hantar OTP ke {email}: {e}")


# ═══════════════════════════════════════════════════
#  Legacy WhatsApp OTP endpoints (kept for compatibility)
# ═══════════════════════════════════════════════════
class OTPRequestBody(BaseModel):
    phone_number: str

class OTPVerifyBody(BaseModel):
    phone_number: str
    otp_code: str

@router.post("/auth/whatsapp/request-otp")
async def request_otp_whatsapp(data: OTPRequestBody, db: Session = Depends(get_db)):
    raise HTTPException(410, detail="WhatsApp OTP telah ditukar ke Email OTP. Guna /auth/email/request-otp-by-email.")

@router.post("/auth/whatsapp/verify-otp")
async def verify_otp_whatsapp(data: OTPVerifyBody, db: Session = Depends(get_db)):
    raise HTTPException(410, detail="WhatsApp OTP telah ditukar ke Email OTP. Guna /auth/email/verify-otp-by-email.")