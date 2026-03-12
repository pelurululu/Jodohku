"""
JODOHKU — routes_api_bridge.py

Jambatan antara frontend.html API calls dan backend yang sedia ada.

Frontend menggunakan struktur API berbeza dari backend asal:
  /api/auth/register/step1   → Daftar peringkat 1 (phone/name/dob/gender)
  /api/auth/register/step2   → Daftar peringkat 2 (email/state/ic)
  /api/auth/register/step3   → Daftar peringkat 3 (photo/terms)
  /api/auth/otp/send         → Hantar OTP ke emel
  /api/auth/otp/verify       → Sahkan OTP & login
  /api/profile               → GET profil semasa
  /api/profile/photo         → POST muat naik gambar profil
  /api/profile/ic-verify     → POST hantar IC untuk semakan
  /api/discover              → GET senarai calon hari ini
  /api/matches               → GET senarai padanan/chat
  /api/matches/create        → POST mulakan chat dengan calon
  /api/messages/{match_id}   → GET/POST mesej
  /api/stats                 → GET statistik pengguna
  /api/premium/tiers         → GET senarai pelan premium
  /api/payment/create        → POST cipta bil
  /api/payment/verify        → POST sahkan bayaran
  /api/pioneer               → GET baki kuota pioneer
  /api/quiz/questions        → GET soalan ujian
  /api/quiz/submit           → POST hantar jawapan ujian
  /api/wingman               → POST kemaskini AI Wingman

  === BAHARU: Permohonan Khas ===
  /api/applications/asnaf    → POST hantar permohonan Asnaf
  /api/applications/mualaf   → POST hantar permohonan Mualaf
  /api/applications/list     → GET senarai permohonan (admin)
  /api/applications/{id}/approve → POST lulus permohonan (admin)
  /api/applications/{id}/reject  → POST tolak permohonan (admin)

  === ADMIN ===
  /api/admin/login           → POST log masuk admin
  /api/admin/users           → GET senarai pengguna
  /api/admin/users/{uid}     → GET/PATCH profil pengguna
  /api/admin/ic-pending      → GET senarai IC menunggu semakan
  /api/admin/stats           → GET statistik sistem
"""
import os, uuid, base64, logging, hashlib, json, httpx
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db, User, OTPRecord, Match, ChatMessage, DailyFeed, Subscription, PioneerStats, Payment
from app.config import settings
from app.ai_engine import calculate_compatibility, generate_ai_verdict, generate_personality_profile
from app.crm import build_registration_payload, build_profile_complete_payload, fire_to_makecom

router = APIRouter(prefix="/api")
logger = logging.getLogger("jodohku.bridge")

# ──────────────────────────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────────────────────────

def _gen_uid():
    import random, string
    return "JDK-" + ''.join(random.choices(string.digits, k=5))

def _gen_otp():
    import random, string
    return ''.join(random.choices(string.digits, k=6))

def _gen_temp_token():
    return "tmp_" + uuid.uuid4().hex

def _gen_access_token(user_id: int):
    import random, string
    return "tok_" + str(user_id) + "_" + ''.join(random.choices(string.ascii_letters + string.digits, k=16))

def _ok(**kwargs):
    return {"success": True, **kwargs}

def _err(msg: str, status: int = 400):
    raise HTTPException(status_code=status, detail={"success": False, "error": msg})

def _get_current_user(request: Request, db: Session) -> User:
    """Dapatkan pengguna dari Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer tok_"):
        raise HTTPException(401, detail={"success": False, "error": "Tidak dibenarkan. Sila log masuk."})
    token = auth.replace("Bearer ", "")
    parts = token.split("_")
    if len(parts) < 2:
        raise HTTPException(401, detail={"success": False, "error": "Token tidak sah."})
    try:
        user_id = int(parts[1])
    except ValueError:
        raise HTTPException(401, detail={"success": False, "error": "Token tidak sah."})
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active or user.is_banned:
        raise HTTPException(401, detail={"success": False, "error": "Sesi tamat. Sila log masuk semula."})
    return user

def _user_to_dict(user: User) -> dict:
    """Serialize pengguna untuk frontend."""
    return {
        "id": user.id,
        "uid": user.uid,
        "nickname": user.full_name,
        "full_name": user.full_name,
        "dob": user.dob or "",
        "age": user.age,
        "gender": "lelaki" if user.gender == "Lelaki" else "perempuan",
        "status": user.status,
        "state": user.state_residence or "",
        "email": user.email or "",
        "tier": user.tier.lower().split()[0] if user.tier else "percuma",
        "tier_full": user.tier or "Basic",
        "is_premium": user.is_premium,
        "message_credits": max(0, settings.FREE_MSG_LIMIT - user.msg_count),
        "profile_photo": user.photo_url if user.photo_url and not user.photo_url.endswith("...") else None,
        "ic_verified": user.ic_verified if hasattr(user, 'ic_verified') and user.ic_verified else False,
        "is_verified": user.is_verified,
        "is_pioneer": user.is_pioneer,
        "psy_done": user.psy_done,
        "ici_score": user.psy_score,
        "dimension_data": user.psy_dims if user.psy_done else None,
        "ai_profile": {"summary": user.psy_type, "ideal_partner": user.psy_desc[:120] + "..." if user.psy_desc and len(user.psy_desc) > 120 else user.psy_desc} if user.psy_done else None,
        "subscription_end": None,
        "trial_end": None,
        "income_class": user.income_class or "",
        "education": user.education or "",
        "occupation": user.occupation or "",
    }

# In-memory temp store for multi-step registration
# Production: guna Redis
_temp_reg: dict = {}

SUPABASE_BUCKET_PHOTOS = "profile-photos"
SUPABASE_BUCKET_IC     = "ic-uploads"
SUPABASE_BUCKET_APPS   = "applications"


async def _upload_to_supabase(file_bytes: bytes, bucket: str, filename: str, content_type: str = "image/jpeg") -> Optional[str]:
    """Upload fail ke Supabase Storage dan pulangkan public URL."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        logger.warning(f"[Supabase] Kelayakan tidak dikonfigurasi — {filename} tidak dimuat naik")
        return None
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{filename}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, content=file_bytes)
            if resp.status_code in (200, 201):
                public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"
                logger.info(f"[Supabase] ✅ Dimuat naik: {public_url}")
                return public_url
            else:
                logger.error(f"[Supabase] ❌ {resp.status_code}: {resp.text}")
                return None
    except Exception as e:
        logger.error(f"[Supabase] ❌ Ralat: {e}")
        return None


# ──────────────────────────────────────────────────────────────────
#  PIONEER COUNT
# ──────────────────────────────────────────────────────────────────

@router.get("/pioneer")
async def get_pioneer(db: Session = Depends(get_db)):
    stats = db.query(PioneerStats).first()
    remaining = (stats.total_quota - stats.claimed) if stats else 3000
    return _ok(remaining=remaining, total=stats.total_quota if stats else 3000)


# ──────────────────────────────────────────────────────────────────
#  REGISTER — 3 STEPS
# ──────────────────────────────────────────────────────────────────

class RegStep1(BaseModel):
    phone: str
    nickname: str
    dob: str
    gender: str
    status: str = "Bujang"
    income: str = ""

class RegStep2(BaseModel):
    tempToken: str
    email: str
    state: str
    ic_last4: str
    captchaPass: bool = True

@router.post("/auth/register/step1")
async def reg_step1(data: RegStep1, db: Session = Depends(get_db)):
    import re
    phone = re.sub(r"[\s\-\(\)\+]", "", data.phone)
    if phone.startswith("60"): phone = "0" + phone[2:]
    if not phone.startswith("0"): phone = "0" + phone

    if len(data.nickname.strip()) < 2:
        _err("Nama panggilan terlalu pendek.")
    if len(phone) < 9:
        _err("Nombor telefon tidak sah.")

    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        _err("Nombor telefon ini sudah berdaftar.")

    # Kira umur dari DOB
    try:
        dob_dt = datetime.strptime(data.dob, "%Y-%m-%d")
        age = (datetime.utcnow() - dob_dt).days // 365
    except:
        age = 0

    if age < 18 or age > 55:
        _err("Umur mestilah 18–55 tahun.")

    temp_token = _gen_temp_token()
    _temp_reg[temp_token] = {
        "phone": phone,
        "nickname": data.nickname.strip(),
        "dob": data.dob,
        "age": age,
        "gender": "Lelaki" if data.gender in ("lelaki", "Lelaki", "L") else "Perempuan",
        "status": data.status,
        "income": data.income,
        "step": 1,
        "created_at": datetime.utcnow().isoformat(),
    }
    return _ok(tempToken=temp_token)


@router.post("/auth/register/step2")
async def reg_step2(data: RegStep2, db: Session = Depends(get_db)):
    import re
    if data.tempToken not in _temp_reg:
        _err("Sesi pendaftaran tamat. Sila mula semula.")
    if not data.email or "@" not in data.email:
        _err("Format email tidak sah.")
    if not re.match(r"^\d{4}$", data.ic_last4):
        _err("Masukkan 4 digit terakhir IC yang sah.")

    existing_email = db.query(User).filter(User.email == data.email.lower()).first()
    if existing_email:
        _err("Emel ini sudah didaftarkan.")

    reg = _temp_reg[data.tempToken]
    reg.update({
        "email": data.email.strip().lower(),
        "state": data.state,
        "ic_last4": data.ic_last4,
        "step": 2,
    })
    new_temp = _gen_temp_token()
    _temp_reg[new_temp] = reg
    del _temp_reg[data.tempToken]

    return _ok(tempToken=new_temp)


@router.post("/auth/register/step3")
async def reg_step3(
    bg: BackgroundTasks,
    tempToken: str = Form(...),
    agreeTerms: str = Form("true"),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    if tempToken not in _temp_reg:
        _err("Sesi pendaftaran tamat. Sila mula semula.")

    reg = _temp_reg.pop(tempToken)
    if reg.get("step", 0) < 2:
        _err("Sila lengkapkan langkah sebelumnya.")

    photo_url = ""
    if photo and photo.filename:
        file_bytes = await photo.read()
        if len(file_bytes) > 5_242_880:
            _err("Saiz gambar melebihi 5MB.")
        ext = photo.filename.rsplit(".", 1)[-1].lower() if "." in photo.filename else "jpg"
        filename = f"profile/{_gen_uid()}_{uuid.uuid4().hex[:8]}.{ext}"
        url = await _upload_to_supabase(file_bytes, SUPABASE_BUCKET_PHOTOS, filename, f"image/{ext}")
        photo_url = url or ""

    uid = _gen_uid()
    user = User(
        uid=uid,
        phone=reg["phone"],
        full_name=reg["nickname"],
        dob=reg.get("dob", ""),
        age=reg.get("age", 0),
        gender=reg.get("gender", "Lelaki"),
        status=reg.get("status", "Bujang"),
        email=reg.get("email", ""),
        state_residence=reg.get("state", ""),
        ic_last4=reg.get("ic_last4", ""),
        photo_url=photo_url,
        income_class=reg.get("income", ""),
        tier="Silver (7-Hari)",
        is_premium=True,
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
    db.refresh(user)

    crm_payload = build_registration_payload({
        "full_name": user.full_name, "phone": user.phone, "age": user.age,
        "gender": user.gender, "status": user.status, "state": user.state_residence,
        "email": user.email, "income_class": user.income_class,
        "tier": user.tier, "created_at": datetime.utcnow().isoformat(),
    })
    bg.add_task(fire_to_makecom, crm_payload, settings.MAKE_WEBHOOK_URL)

    token = _gen_access_token(user.id)
    return _ok(
        token=token,
        message=f"Selamat datang ke Jodohku, {user.full_name}! 🎉",
        user=_user_to_dict(user),
    )


# ──────────────────────────────────────────────────────────────────
#  OTP LOGIN
# ──────────────────────────────────────────────────────────────────

class OTPSendBody(BaseModel):
    email: str

class OTPVerifyBody(BaseModel):
    email: str
    otp: str

@router.post("/auth/otp/send")
async def send_otp(data: OTPSendBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if not email or "@" not in email:
        _err("Format email tidak sah.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        _err("Emel tidak dijumpai. Sila daftar dahulu.")

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent = db.query(OTPRecord).filter(
        OTPRecord.phone == email,
        OTPRecord.created_at >= one_hour_ago
    ).count()
    if recent >= 5:
        _err("Terlalu banyak percubaan. Cuba lagi dalam 1 jam.", 429)

    otp_code = _gen_otp()
    record = OTPRecord(
        phone=email, otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(record)
    db.commit()

    bg.add_task(_send_email_otp_bg, email, otp_code, user.full_name)

    return _ok(
        message=f"Kod OTP dihantar ke {email}.",
        dev_otp=otp_code if settings.DEBUG else None,
    )


@router.post("/auth/otp/verify")
async def verify_otp(data: OTPVerifyBody, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    otp = data.otp.strip()

    if len(otp) != 6:
        _err("Kod OTP mesti 6 digit.")

    # Debug shortcut
    if settings.DEBUG and otp == "123456":
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.last_active = datetime.utcnow()
            db.commit()
            token = _gen_access_token(user.id)
            return _ok(token=token, user=_user_to_dict(user))
        _err("Akaun tidak ditemui.", 404)

    record = db.query(OTPRecord).filter(
        OTPRecord.phone == email,
        OTPRecord.otp_code == otp,
        OTPRecord.is_used == False,
        OTPRecord.expires_at >= datetime.utcnow(),
    ).order_by(OTPRecord.created_at.desc()).first()

    if not record:
        _err("OTP tidak sah atau telah tamat tempoh.", 401)

    record.is_used = True
    db.commit()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        _err("Akaun tidak ditemui.", 404)

    user.last_active = datetime.utcnow()
    db.commit()

    token = _gen_access_token(user.id)
    return _ok(token=token, user=_user_to_dict(user))


async def _send_email_otp_bg(email: str, otp: str, name: str):
    if not settings.BREVO_API_KEY:
        logger.warning(f"[EMAIL] BREVO_API_KEY tidak ada. OTP {otp} untuk {email}")
        return
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {"accept": "application/json", "api-key": settings.BREVO_API_KEY, "content-type": "application/json"}
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#05050E;color:#ECEBF8;border-radius:16px">
      <h2 style="color:#C9A84C">Jodohku — Log Masuk</h2>
      <p style="color:#9494BC">Salam {name},</p>
      <p>Kod OTP anda:</p>
      <div style="background:#15152B;border:1px solid rgba(201,168,76,.25);border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#C9A84C">{otp}</span>
      </div>
      <p style="color:#5A5A80;font-size:12px">Sah 10 minit. Jangan kongsi kod ini.</p>
    </div>"""
    payload = {
        "sender": {"name": settings.BREVO_SENDER_NAME, "email": settings.BREVO_SENDER_EMAIL},
        "to": [{"email": email, "name": name}],
        "subject": f"Kod Log Masuk Jodohku: {otp}",
        "htmlContent": html,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url, headers=headers, json=payload)
    except Exception as e:
        logger.error(f"[EMAIL] Gagal: {e}")


# ──────────────────────────────────────────────────────────────────
#  PROFILE
# ──────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)
    return _ok(user=_user_to_dict(user))


@router.post("/profile/photo")
async def upload_profile_photo(
    request: Request,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = _get_current_user(request, db)
    file_bytes = await photo.read()
    if len(file_bytes) > 5_242_880:
        _err("Saiz gambar melebihi 5MB.")

    ext = photo.filename.rsplit(".", 1)[-1].lower() if photo.filename and "." in photo.filename else "jpg"
    filename = f"profile/{user.uid}_{uuid.uuid4().hex[:8]}.{ext}"
    url = await _upload_to_supabase(file_bytes, SUPABASE_BUCKET_PHOTOS, filename, f"image/{ext}")

    if url:
        user.photo_url = url
        db.commit()
        return _ok(photo=url, message="Gambar berjaya dikemaskini!")
    else:
        # Fallback: simpan sebagai relative path
        user.photo_url = f"/photos/{user.uid}.{ext}"
        db.commit()
        return _ok(photo=user.photo_url, message="Gambar disimpan (Supabase tidak dikonfigurasi).")


@router.post("/profile/ic-verify")
async def upload_ic(
    request: Request,
    ic_photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = _get_current_user(request, db)
    file_bytes = await ic_photo.read()

    if not file_bytes or len(file_bytes) < 100:
        _err("Gambar IC tidak sah.")
    if len(file_bytes) > 5_242_880:
        _err("Saiz gambar melebihi 5MB.")

    ext = ic_photo.filename.rsplit(".", 1)[-1].lower() if ic_photo.filename and "." in ic_photo.filename else "jpg"
    filename = f"ic/{user.uid}_{uuid.uuid4().hex[:8]}.{ext}"
    url = await _upload_to_supabase(file_bytes, SUPABASE_BUCKET_IC, filename, f"image/{ext}")

    try:
        user.ic_verified = "pending"
    except:
        pass
    user.is_verified = False
    db.commit()

    logger.info(f"[IC] IC diterima untuk {user.uid} — URL: {url or 'tiada Supabase'}")
    return _ok(
        ic_verified="pending",
        message="IC diterima. Pengesahan dalam masa 1–24 jam.",
        supabase_url=url,
    )


@router.post("/wingman")
async def update_wingman(
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_current_user(request, db)
    body = await request.json()
    edu = body.get("education", "")
    sector = body.get("sector", "")
    if edu: user.education = edu
    if sector: user.occupation = sector
    db.commit()
    return _ok(message="AI Wingman dikemaskini!")


# ──────────────────────────────────────────────────────────────────
#  DISCOVER
# ──────────────────────────────────────────────────────────────────

@router.get("/discover")
async def discover(request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)

    if not user.psy_done:
        return _ok(candidates=[], reason="quiz_incomplete")

    today = datetime.utcnow().strftime("%Y-%m-%d")
    cached = db.query(DailyFeed).filter(
        DailyFeed.user_uid == user.uid, DailyFeed.feed_date == today
    ).all()

    if cached:
        result = []
        for f in cached:
            c = db.query(User).filter(User.uid == f.candidate_uid).first()
            if c:
                result.append(_build_candidate_dict(c, f.compatibility_score, f.ai_verdict))
        return _ok(candidates=result)

    opposite = "Perempuan" if user.gender == "Lelaki" else "Lelaki"
    pool = db.query(User).filter(
        User.uid != user.uid, User.gender == opposite,
        User.is_active == True, User.is_banned == False,
    ).all()

    scored = []
    for c in pool:
        score = calculate_compatibility(user.psy_dims or {}, c.psy_dims or {})
        if score >= 75:
            verdict = generate_ai_verdict(user.psy_dims or {}, c.psy_dims or {}, c.full_name, score)
            scored.append({"user": c, "score": score, "verdict": verdict})

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:settings.DAILY_CANDIDATES]

    result = []
    for item in top:
        c = item["user"]
        feed = DailyFeed(
            user_uid=user.uid, candidate_uid=c.uid,
            compatibility_score=item["score"], ai_verdict=item["verdict"], feed_date=today,
        )
        db.add(feed)
        result.append(_build_candidate_dict(c, item["score"], item["verdict"]))

    db.commit()
    return _ok(candidates=result)


def _build_candidate_dict(c: User, score: float, verdict: str) -> dict:
    tier_map = {"Silver (7-Hari)": "silver", "Gold": "gold", "Platinum": "platinum", "Sovereign": "sovereign"}
    return {
        "id": c.uid,
        "nickname": c.full_name,
        "age": c.age,
        "state": c.state_residence or "",
        "gender": "lelaki" if c.gender == "Lelaki" else "perempuan",
        "tier": tier_map.get(c.tier, "percuma"),
        "match_score": round(score, 1),
        "ai_summary": verdict,
        "photo": c.photo_url if c.photo_url and not c.photo_url.endswith("...") else None,
        "traits": c.psy_traits or [],
    }


# ──────────────────────────────────────────────────────────────────
#  MATCHES & CHAT
# ──────────────────────────────────────────────────────────────────

@router.get("/matches")
async def get_matches(request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)

    matches = db.query(Match).filter(
        ((Match.user1_id == user.id) | (Match.user2_id == user.id)),
        Match.is_active == True,
    ).all()

    result = []
    for m in matches:
        partner_id = m.user2_id if m.user1_id == user.id else m.user1_id
        partner = db.query(User).filter(User.id == partner_id).first()
        if not partner: continue

        last_msg = db.query(ChatMessage).filter(
            ChatMessage.match_id == m.match_uid
        ).order_by(ChatMessage.created_at.desc()).first()

        result.append({
            "id": m.match_uid,
            "partner_name": partner.full_name,
            "partner_photo": partner.photo_url if partner.photo_url and not partner.photo_url.endswith("...") else None,
            "partner_tier": partner.tier.lower().split()[0] if partner.tier else "percuma",
            "match_score": round(m.compatibility_score, 1),
            "last_message": last_msg.message_text if last_msg else "",
            "last_chat": last_msg.created_at.isoformat() if last_msg else "",
            "unread": 0,
        })

    return _ok(matches=result)


class CreateMatchBody(BaseModel):
    targetUserId: str

@router.post("/matches/create")
async def create_match(data: CreateMatchBody, request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)
    target = db.query(User).filter(User.uid == data.targetUserId).first()
    if not target:
        _err("Pengguna tidak ditemui.", 404)

    existing = db.query(Match).filter(
        ((Match.user1_id == user.id) & (Match.user2_id == target.id)) |
        ((Match.user1_id == target.id) & (Match.user2_id == user.id))
    ).first()

    if existing:
        return _ok(match_id=existing.match_uid)

    import random, string
    match_uid = "mid_" + ''.join(random.choices(string.digits, k=10))
    score = calculate_compatibility(user.psy_dims or {}, target.psy_dims or {})
    verdict = generate_ai_verdict(user.psy_dims or {}, target.psy_dims or {}, target.full_name, score)

    match = Match(
        match_uid=match_uid,
        user1_id=user.id,
        user2_id=target.id,
        compatibility_score=score,
        ai_verdict=verdict,
    )
    db.add(match)

    # System welcome message
    welcome = ChatMessage(
        match_id=match_uid,
        sender_uid="SYSTEM",
        message_text=f"💕 Tahniah! Anda dan {target.full_name} kini sepadan dengan {round(score,1)}% keserasian. Mulakan perbualan!",
        is_system=True,
    )
    db.add(welcome)
    db.commit()

    return _ok(match_id=match_uid)


@router.get("/messages/{match_id}")
async def get_messages(match_id: str, request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)

    msgs = db.query(ChatMessage).filter(
        ChatMessage.match_id == match_id
    ).order_by(ChatMessage.created_at.asc()).all()

    tier_low = (user.tier or "").lower()
    is_premium = user.is_premium or tier_low not in ("basic", "percuma", "")
    credits_left = max(0, settings.FREE_MSG_LIMIT - user.msg_count) if not is_premium else 999

    return _ok(
        messages=[{
            "id": m.id,
            "sender_id": m.sender_uid,
            "content": m.message_text,
            "is_system": m.is_system,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        } for m in msgs],
        user_credits=credits_left,
        user_tier=tier_low.split()[0] if tier_low else "percuma",
    )


class SendMsgBody(BaseModel):
    content: str

SCAM_PATTERNS_RE = [
    r"\b(whatsapp|telegram|signal)\b.*\b(luar|outside|direct)\b",
    r"\b(wang|money|rm\d+|transfer|bayar|pay)\b",
    r"bit\.ly|tinyurl|t\.me/|wa\.me/",
    r"\b(atm|bank|akaun|account.?number)\b",
]

@router.post("/messages/{match_id}")
async def send_message(match_id: str, data: SendMsgBody, request: Request, db: Session = Depends(get_db)):
    import re
    user = _get_current_user(request, db)

    if not data.content.strip():
        _err("Mesej tidak boleh kosong.")
    if len(data.content) > 2000:
        _err("Mesej terlalu panjang.")

    for pat in SCAM_PATTERNS_RE:
        if re.search(pat, data.content, re.IGNORECASE):
            _err("Mesej mengandungi kandungan berpotensi penipuan.")

    tier_low = (user.tier or "").lower()
    is_premium = user.is_premium or tier_low not in ("basic", "percuma", "")

    if not is_premium and user.msg_count >= settings.FREE_MSG_LIMIT:
        raise HTTPException(403, detail={"success": False, "error": "Had mesej percuma tercapai.", "upgrade_required": True})

    msg = ChatMessage(
        match_id=match_id,
        sender_uid=str(user.id),
        message_text=data.content,
    )
    db.add(msg)

    if not is_premium:
        user.msg_count += 1

    match = db.query(Match).filter(Match.match_uid == match_id).first()
    if match:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        days = match.chat_day_list or []
        if today not in days:
            days.append(today)
            match.chat_day_list = days

    db.commit()
    db.refresh(msg)

    credits_left = max(0, settings.FREE_MSG_LIMIT - user.msg_count) if not is_premium else 999
    return _ok(
        message={
            "id": msg.id,
            "sender_id": str(user.id),
            "content": data.content,
            "is_system": False,
            "created_at": msg.created_at.isoformat() if msg.created_at else "",
        },
        remaining_credits=credits_left,
    )


# ──────────────────────────────────────────────────────────────────
#  STATS
# ──────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)

    total_matches = db.query(Match).filter(
        (Match.user1_id == user.id) | (Match.user2_id == user.id)
    ).count()

    high_matches = db.query(Match).filter(
        ((Match.user1_id == user.id) | (Match.user2_id == user.id)),
        Match.compatibility_score >= 90
    ).count()

    total_convos = db.query(ChatMessage).filter(
        ChatMessage.sender_uid == str(user.id)
    ).count()

    return _ok(stats={
        "total_matches": total_matches,
        "high_matches": high_matches,
        "total_convos": total_convos,
        "ici_score": user.psy_score or 0,
        "ai_profile": {
            "summary": user.psy_type or "",
            "ideal_partner": user.psy_desc[:120] + "..." if user.psy_desc and len(user.psy_desc) > 120 else (user.psy_desc or ""),
        } if user.psy_done else None,
    })


# ──────────────────────────────────────────────────────────────────
#  PREMIUM TIERS
# ──────────────────────────────────────────────────────────────────

TIERS = [
    {
        "id": "silver", "name": "Silver", "price": 19.99, "period": "bulan",
        "features": ["✅ 5 calon sehari", "✅ 50 mesej/bulan", "✅ AI Analisis asas", "✅ Semakan IC"],
        "popular": False, "invite_only": False,
    },
    {
        "id": "gold", "name": "Gold", "price": 59.99, "period": "bulan",
        "features": ["✅ 10 calon sehari", "✅ Mesej tanpa had", "✅ AI Profil lengkap", "✅ AI Wingman", "✅ Sorotan profil"],
        "popular": True, "invite_only": False,
    },
    {
        "id": "platinum", "name": "Platinum", "price": 299.99, "period": "bulan",
        "features": ["✅ Semua ciri Gold", "✅ Hantar nombor WhatsApp", "✅ Padanan terpilih manual", "✅ Sokongan keutamaan"],
        "popular": False, "invite_only": False,
    },
    {
        "id": "sovereign", "name": "Black Sovereign", "price": 4999.00, "period": "tahun",
        "features": ["👑 Padanan eksklusif VVIP", "👑 Pengurus perhubungan peribadi", "👑 Semua ciri Platinum", "👑 Had: 50 ahli sahaja"],
        "popular": False, "invite_only": True,
    },
]

@router.get("/premium/tiers")
async def get_tiers():
    return _ok(tiers=TIERS)


# ──────────────────────────────────────────────────────────────────
#  PAYMENT
# ──────────────────────────────────────────────────────────────────

class PaymentCreateBody(BaseModel):
    tier: str

TIER_PRICES_MAP = {
    "silver": ("Silver", 19.99),
    "gold": ("Gold", 59.99),
    "platinum": ("Platinum", 299.99),
    "sovereign": ("Sovereign", 4999.00),
}

@router.post("/payment/create")
async def create_payment(data: PaymentCreateBody, request: Request, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)
    tier_info = TIER_PRICES_MAP.get(data.tier.lower())
    if not tier_info:
        _err("Tier tidak sah.")
    tier_name, amount = tier_info

    payment = Payment(user_uid=user.uid, tier=tier_name, amount=amount)
    db.add(payment)
    db.commit()

    if not settings.TOYYIBPAY_SECRET or not settings.TOYYIBPAY_CATEGORY:
        return _ok(
            payment_url=None,
            payment_id=payment.id,
            message="Sistem pembayaran dalam konfigurasi. Hubungi admin.",
        )

    tp_url = f"{settings.TOYYIBPAY_URL}/index.php/api/createBill"
    tp_data = {
        "userSecretKey": settings.TOYYIBPAY_SECRET,
        "categoryCode": settings.TOYYIBPAY_CATEGORY,
        "billName": f"Jodohku_{tier_name}"[:30],
        "billDescription": f"Langganan_{tier_name}"[:100],
        "billPriceSetting": 1, "billPayorInfo": 1,
        "billAmount": int(amount * 100),
        "billReturnUrl": f"{settings.FRONTEND_URL}?payment_success=true&tier={data.tier}&ref={payment.id}",
        "billCallbackUrl": f"{settings.BACKEND_URL}/api/payment/callback",
        "billExternalReferenceNo": f"JDK-{payment.id}",
        "billTo": user.full_name,
        "billEmail": user.email or "",
        "billPhone": user.phone,
        "billPaymentChannel": 2,
        "billExpiryDays": 1,
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(tp_url, data=tp_data, timeout=15)
            result = resp.json()
            if result and len(result) > 0 and "BillCode" in result[0]:
                billcode = result[0]["BillCode"]
                payment.billcode = billcode
                db.commit()
                return _ok(payment_url=f"{settings.TOYYIBPAY_URL}/{billcode}", payment_id=payment.id)
    except Exception as e:
        logger.error(f"[PAY] {e}")
    _err("Gagal mencipta bil pembayaran.", 500)


class PaymentVerifyBody(BaseModel):
    payment_id: int
    tier: str

@router.post("/payment/verify")
async def verify_payment(data: PaymentVerifyBody, request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)
    payment = db.query(Payment).filter(Payment.id == data.payment_id, Payment.user_uid == user.uid).first()
    if not payment:
        _err("Rekod pembayaran tidak ditemui.", 404)

    if payment.status != "Completed":
        payment.status = "Completed"
        payment.completed_at = datetime.utcnow()
        tier_info = TIER_PRICES_MAP.get(data.tier.lower(), (data.tier, 0))
        tier_name = tier_info[0]
        days = 365 if "sovereign" in data.tier.lower() else 30
        user.tier = tier_name
        user.is_premium = True
        user.msg_count = 0
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if sub:
            sub.tier = tier_name; sub.status = "Active"
            sub.started_at = datetime.utcnow()
            sub.expires_at = datetime.utcnow() + timedelta(days=days)
        db.commit()

    return _ok(user=_user_to_dict(user), message=f"Langganan {data.tier} diaktifkan!")


# ──────────────────────────────────────────────────────────────────
#  QUIZ
# ──────────────────────────────────────────────────────────────────

QUIZ_QUESTIONS = [
    {"id": 1, "category": "kewangan", "question_bm": "💰 Anda baru terima bonus RM10,000. Tindakan pertama?",
     "options": ["Simpan terus dalam ASB/FD","Bahagi: 50% simpan, 30% labur, 20% keluarga","Belanjakan untuk pengalaman bersama tersayang","Bayar semua hutang dahulu"],
     "scores": [7,9,6,8]},
    {"id": 2, "category": "agama", "question_bm": "🕌 Amalan agama harian pasangan adalah:",
     "options": ["Sangat penting — soleh/solehah","Penting — solat 5 waktu","Perlu ada tetapi tidak ketat","Urusan peribadi masing-masing"],
     "scores": [10,8,6,4]},
    {"id": 3, "category": "keluarga", "question_bm": "👨‍👩‍👧 Seberapa penting restu ibu bapa dalam perkahwinan? (1-10)",
     "options": ["Sangat penting (9-10)","Penting (7-8)","Sederhana (5-6)","Kurang penting (1-4)"],
     "scores": [10,8,6,4]},
    {"id": 4, "category": "komunikasi", "question_bm": "🗣️ Cara terbaik anda berkomunikasi dengan pasangan?",
     "options": ["Bersemuka setiap hari","Telefon/video call kerap","Mesej WhatsApp sudah cukup","Biar ada ruang peribadi"],
     "scores": [9,8,7,5]},
    {"id": 5, "category": "kerjaya", "question_bm": "💼 Kerjaya vs keluarga — bagaimana anda imbangkan?",
     "options": ["Keluarga sentiasa utama","Kerjaya penting tapi keluarga nombor 1","Dua-dua sama penting","Kerjaya dulu sehingga stabil"],
     "scores": [10,8,7,5]},
    {"id": 6, "category": "anak", "question_bm": "👶 Berapa anak yang anda impikan?",
     "options": ["3-4 orang (keluarga besar)","1-2 orang (kecil tapi berkualiti)","Lebih dari 4","Terbuka mengikut ketentuan Allah"],
     "scores": [8,7,9,10]},
    {"id": 7, "category": "konflik", "question_bm": "🤝 Apabila berlaku perbalahan dengan pasangan:",
     "options": ["Berbincang dengan tenang segera","Beri ruang 1-2 jam kemudian bincang","Minta penengah (ibu bapa/kawan)","Tulis perasaan dalam mesej"],
     "scores": [9,8,7,6]},
    {"id": 8, "category": "gaya_hidup", "question_bm": "🏡 Gaya hidup ideal anda:",
     "options": ["Bandar — dekat kemudahan & hiburan","Pinggir bandar — seimbang","Luar bandar — tenang & alam","Fleksibel mengikut keperluan"],
     "scores": [7,9,8,6]},
    {"id": 9, "category": "makanan", "question_bm": "🍱 Tabiat makan anda:",
     "options": ["Masak di rumah setiap hari","Campuran masak & makan luar","Makan luar lebih selalu","Tak kisah asalkan halal & sedap"],
     "scores": [9,8,6,7]},
    {"id": 10, "category": "aktiviti", "question_bm": "🏃 Aktiviti hujung minggu pilihan:",
     "options": ["Sukan & outdoor bersama keluarga","Baca buku & aktiviti ilmu","Jalan-jalan & shopping","Rehat di rumah sahaja"],
     "scores": [9,8,7,6]},
    {"id": 11, "category": "pemikiran", "question_bm": "🧠 Cara anda buat keputusan besar:",
     "options": ["Berdasarkan logik & data","Ikut naluri & perasaan","Minta nasihat orang dipercayai","Solat istikharah & serah pada Allah"],
     "scores": [8,7,8,10]},
    {"id": 12, "category": "kebersihan", "question_bm": "🧹 Standard kebersihan rumah anda:",
     "options": ["Sangat kemas — semua tempat bersih","Kemas secara umum","Selagi tidak terlalu berselerak","Bersih tapi tak terlalu ketat"],
     "scores": [9,8,6,7]},
    {"id": 13, "category": "sosial", "question_bm": "👥 Dalam majlis sosial, anda biasanya:",
     "options": ["Aktif & mudah mesra dengan semua","Bersosial dengan orang dikenali sahaja","Lebih suka pemerhatian dari jauh","Ikut situasi & mood"],
     "scores": [9,8,6,7]},
    {"id": 14, "category": "emosi", "question_bm": "💝 Cara anda tunjukkan kasih sayang:",
     "options": ["Kata-kata penghargaan","Masa berkualiti bersama","Hadiah & surpris","Bantuan & tindakan nyata"],
     "scores": [9,10,8,9]},
    {"id": 15, "category": "masa_depan", "question_bm": "🎯 Visi 5 tahun akan datang:",
     "options": ["Berkeluarga & rumah sendiri","Kerjaya cemerlang & stabil","Kembara & pengalaman baru","Seimbang antara semua aspek"],
     "scores": [10,8,7,9]},
    {"id": 16, "category": "teknologi", "question_bm": "📱 Penggunaan media sosial anda:",
     "options": ["Sangat terhad — privasi utama","Aktif tapi selektif","Aktif & suka berkongsi","Hampir tiada media sosial"],
     "scores": [8,9,6,7]},
    {"id": 17, "category": "kewangan", "question_bm": "💳 Tabiat belanja anda:",
     "options": ["Rancang bajet ketat setiap bulan","Simpan dulu kemudian belanja","Hidup dalam kemampuan","Fleksibel mengikut keperluan"],
     "scores": [9,10,8,7]},
    {"id": 18, "category": "keluarga", "question_bm": "👴 Tanggungjawab kepada ibu bapa:",
     "options": ["Tinggal bersama & jaga sendiri","Sediakan rumah berdekatan","Hantar duit bulanan","Serahin kepada institusi jagaan"],
     "scores": [10,9,7,4]},
    {"id": 19, "category": "agama", "question_bm": "🤲 Pendidikan agama untuk anak-anak:",
     "options": ["Wajib — sekolah agama & hafazan","Penting — kelas agama hujung minggu","Asas sahaja","Pilihan anak sendiri"],
     "scores": [10,8,6,4]},
    {"id": 20, "category": "komunikasi", "question_bm": "💬 Jika pasangan buat silap, anda:",
     "options": ["Tegur segera dengan baik","Tunggu masa yang sesuai","Tulis surat/mesej perasaan","Berdoa & bersabar"],
     "scores": [9,8,7,8]},
    {"id": 21, "category": "rumah_tangga", "question_bm": "🏠 Pembahagian tugas rumah tangga:",
     "options": ["Bahagi sama rata","Mengikut kemampuan & masa","Ikut tradisi — isteri dapur","Ambil pembantu rumah"],
     "scores": [9,10,7,6]},
    {"id": 22, "category": "gaya_hidup", "question_bm": "✈️ Percutian ideal anda:",
     "options": ["Luar negara sekali setahun","Domestik — eksplor Malaysia","Kampung & alam semula jadi","Staycation — rehat di rumah"],
     "scores": [8,9,8,7]},
    {"id": 23, "category": "komitmen", "question_bm": "💍 Berapa lama tempoh bertunang ideal?",
     "options": ["3-6 bulan (singkat tapi bermakna)","6-12 bulan (sederhana)","1-2 tahun (persediaan matang)","Ikut keadaan & kemampuan"],
     "scores": [8,9,10,7]},
    {"id": 24, "category": "personaliti", "question_bm": "🌟 Kekuatan utama anda dalam perhubungan:",
     "options": ["Kesetiaan & komitmen penuh","Komunikasi terbuka & jujur","Sokongan emosi yang kuat","Kesabaran & pemaaf"],
     "scores": [9,9,9,10]},
    {"id": 25, "category": "masa_depan", "question_bm": "📚 Pembangunan diri dalam perkahwinan:",
     "options": ["Belajar bersama — kursus & seminar","Galakkan masing-masing untuk maju","Fokus kepada keperluan keluarga","Seimbang antara semua aspek"],
     "scores": [9,9,8,10]},
    {"id": 26, "category": "keluarga", "question_bm": "🤝 Perhubungan dengan keluarga mentua:",
     "options": ["Anggap seperti ibu bapa sendiri","Hormati tetapi ada sempadan","Kekeluargaan tapi ruang peribadi","Bergantung kepada situasi"],
     "scores": [10,8,9,7]},
    {"id": 27, "category": "emosi", "question_bm": "😔 Apabila stres atau sedih, anda:",
     "options": ["Kongsi dengan pasangan segera","Selesaikan sendiri dahulu","Luahkan kepada kawan rapat","Solat & doa memohon kekuatan"],
     "scores": [9,7,7,10]},
    {"id": 28, "category": "konflik", "question_bm": "🛑 Perkara yang tidak boleh dimaafkan dalam perkahwinan:",
     "options": ["Pengkhianatan / curang","Keganasan rumah tangga","Penipuan kewangan","Kurang hormat keluarga"],
     "scores": [10,10,9,8]},
    {"id": 29, "category": "komitmen", "question_bm": "🌙 Tanggungjawab agama dalam rumah tangga:",
     "options": ["Solat jemaah bersama setiap hari","Baca Quran bersama","Hadiri kuliah agama bersama","Semua di atas adalah matlamat"],
     "scores": [9,8,8,10]},
    {"id": 30, "category": "personaliti", "question_bm": "💫 Satu perkataan yang paling menggambarkan anda:",
     "options": ["Bertanggungjawab","Penyayang","Semangat","Sabar & tekun"],
     "scores": [9,9,8,10]},
]

@router.get("/quiz/questions")
async def get_quiz_questions():
    return _ok(questions=QUIZ_QUESTIONS, total=len(QUIZ_QUESTIONS))


class QuizSubmitBody(BaseModel):
    answers: dict  # {1: 0, 2: 1, ...} — question_id: option_index
    personalityBio: str = ""

@router.post("/quiz/submit")
async def submit_quiz(data: QuizSubmitBody, request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = _get_current_user(request, db)

    # Kira skor
    total_score = 0
    total_weight = 0
    answers_stored = {}
    dims: dict = {}

    for q in QUIZ_QUESTIONS:
        qid = q["id"]
        opt_idx = data.answers.get(qid) or data.answers.get(str(qid))
        if opt_idx is None:
            continue
        try:
            opt_idx = int(opt_idx)
            score = q["scores"][opt_idx]
        except (IndexError, ValueError):
            continue
        total_score += score
        total_weight += 1
        answers_stored[f"q{qid}"] = {"val": opt_idx, "score": score}

        cat = q["category"]
        if cat not in dims:
            dims[cat] = []
        dims[cat].append(score)

    avg_score = total_score / total_weight if total_weight > 0 else 5.0
    avg_dims = {k: round(sum(v) / len(v), 1) for k, v in dims.items()}

    # Jana profil
    profile = generate_personality_profile(answers_stored, avg_score, data.personalityBio)

    user.psy_answers = answers_stored
    user.psy_score = round(avg_score, 2)
    user.psy_type = profile["psy_type"]
    user.psy_desc = profile["psy_desc"]
    user.psy_traits = profile["psy_traits"]
    user.psy_dims = avg_dims
    user.psy_custom_text = data.personalityBio[:500] if data.personalityBio else ""
    user.psy_done = True
    db.commit()

    crm_payload = build_profile_complete_payload({
        "full_name": user.full_name, "phone": user.phone, "age": user.age,
        "gender": user.gender, "status": user.status, "state": user.state_residence,
        "education": user.education, "occupation": user.occupation,
        "income_class": user.income_class, "psy_score": user.psy_score,
        "psy_type": user.psy_type, "psy_desc": user.psy_desc,
        "psy_traits": user.psy_traits, "psy_dims": user.psy_dims,
        "psy_custom_text": user.psy_custom_text, "photo_url": user.photo_url, "tier": user.tier,
    })
    bg.add_task(fire_to_makecom, crm_payload, settings.MAKE_WEBHOOK_URL)

    return _ok(
        ici_score=round(avg_score, 1),
        psy_type=user.psy_type,
        psy_traits=user.psy_traits,
        ai_profile={
            "summary": user.psy_type,
            "ideal_partner": user.psy_desc[:200] if user.psy_desc else "",
        },
        message="Analisis keperibadian selesai! 🎉",
    )


# ──────────────────────────────────────────────────────────────────
#  APPLICATIONS: ASNAF, MUALAF, IC (BAHARU)
#  Semua dokumen disimpan ke Supabase Storage
# ──────────────────────────────────────────────────────────────────

# In-memory store untuk applications (production: guna table DB)
_applications: dict = {}
_app_counter = {"n": 0}

def _new_app_id():
    _app_counter["n"] += 1
    return f"APP-{datetime.utcnow().strftime('%Y%m%d')}-{_app_counter['n']:04d}"


@router.post("/applications/asnaf")
async def submit_asnaf(
    request: Request,
    full_name: str = Form(...),
    ic_number: str = Form(...),
    address: str = Form(...),
    asnaf_category: str = Form(...),  # Fakir, Miskin, Gharimin, dsb
    monthly_income: str = Form(...),
    dependents: str = Form("0"),
    supporting_doc: UploadFile = File(...),
    ic_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    user = _get_current_user(request, db)
    app_id = _new_app_id()

    # Upload dokumen sokongan
    doc_bytes = await supporting_doc.read()
    if len(doc_bytes) > 10_485_760:
        _err("Saiz dokumen melebihi 10MB.")

    ext = supporting_doc.filename.rsplit(".", 1)[-1].lower() if supporting_doc.filename and "." in supporting_doc.filename else "jpg"
    doc_filename = f"asnaf/{user.uid}/{app_id}_doc.{ext}"
    doc_url = await _upload_to_supabase(doc_bytes, SUPABASE_BUCKET_APPS, doc_filename, f"image/{ext}" if ext in ("jpg","jpeg","png") else "application/pdf")

    ic_url = None
    if ic_photo and ic_photo.filename:
        ic_bytes = await ic_photo.read()
        ic_filename = f"asnaf/{user.uid}/{app_id}_ic.jpg"
        ic_url = await _upload_to_supabase(ic_bytes, SUPABASE_BUCKET_APPS, ic_filename, "image/jpeg")

    _applications[app_id] = {
        "id": app_id,
        "type": "asnaf",
        "user_uid": user.uid,
        "user_name": user.full_name,
        "user_email": user.email,
        "full_name": full_name,
        "ic_number": ic_number,
        "address": address,
        "asnaf_category": asnaf_category,
        "monthly_income": monthly_income,
        "dependents": dependents,
        "doc_url": doc_url,
        "ic_url": ic_url,
        "status": "pending",
        "submitted_at": datetime.utcnow().isoformat(),
        "reviewed_by": None,
        "review_note": "",
        "reviewed_at": None,
    }

    logger.info(f"[APP] Permohonan Asnaf {app_id} dari {user.uid}")
    return _ok(
        app_id=app_id,
        message="Permohonan Asnaf berjaya dihantar. Semakan dalam 3-5 hari bekerja.",
        doc_uploaded=doc_url is not None,
    )


@router.post("/applications/mualaf")
async def submit_mualaf(
    request: Request,
    full_name: str = Form(...),
    ic_number: str = Form(...),
    conversion_date: str = Form(...),
    conversion_state: str = Form(...),
    sijil_mualaf: UploadFile = File(...),
    ic_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    user = _get_current_user(request, db)
    app_id = _new_app_id()

    cert_bytes = await sijil_mualaf.read()
    if len(cert_bytes) > 10_485_760:
        _err("Saiz sijil melebihi 10MB.")

    ext = sijil_mualaf.filename.rsplit(".", 1)[-1].lower() if sijil_mualaf.filename and "." in sijil_mualaf.filename else "jpg"
    cert_filename = f"mualaf/{user.uid}/{app_id}_sijil.{ext}"
    cert_url = await _upload_to_supabase(cert_bytes, SUPABASE_BUCKET_APPS, cert_filename, f"image/{ext}" if ext in ("jpg","jpeg","png") else "application/pdf")

    ic_url = None
    if ic_photo and ic_photo.filename:
        ic_bytes = await ic_photo.read()
        ic_filename = f"mualaf/{user.uid}/{app_id}_ic.jpg"
        ic_url = await _upload_to_supabase(ic_bytes, SUPABASE_BUCKET_APPS, ic_filename, "image/jpeg")

    _applications[app_id] = {
        "id": app_id,
        "type": "mualaf",
        "user_uid": user.uid,
        "user_name": user.full_name,
        "user_email": user.email,
        "full_name": full_name,
        "ic_number": ic_number,
        "conversion_date": conversion_date,
        "conversion_state": conversion_state,
        "cert_url": cert_url,
        "ic_url": ic_url,
        "status": "pending",
        "submitted_at": datetime.utcnow().isoformat(),
        "reviewed_by": None,
        "review_note": "",
        "reviewed_at": None,
    }

    logger.info(f"[APP] Permohonan Mualaf {app_id} dari {user.uid}")
    return _ok(
        app_id=app_id,
        message="Permohonan Mualaf berjaya dihantar. Semakan dalam 3-5 hari bekerja.",
        cert_uploaded=cert_url is not None,
    )


@router.get("/applications/list")
async def list_applications(request: Request, type: Optional[str] = None):
    """Admin only — senarai semua permohonan."""
    _require_admin(request)
    apps = list(_applications.values())
    if type:
        apps = [a for a in apps if a["type"] == type]
    apps.sort(key=lambda x: x["submitted_at"], reverse=True)
    return _ok(applications=apps, total=len(apps))


@router.post("/applications/{app_id}/approve")
async def approve_application(app_id: str, request: Request, db: Session = Depends(get_db)):
    """Admin only — luluskan permohonan."""
    _require_admin(request)
    body = await request.json()
    note = body.get("note", "")
    if app_id not in _applications:
        _err("Permohonan tidak ditemui.", 404)
    _applications[app_id]["status"] = "approved"
    _applications[app_id]["review_note"] = note
    _applications[app_id]["reviewed_at"] = datetime.utcnow().isoformat()

    # Kemaskini status pengguna
    app = _applications[app_id]
    user = db.query(User).filter(User.uid == app["user_uid"]).first()
    if user and app["type"] == "mualaf":
        user.status = "Mualaf"
        db.commit()

    return _ok(message=f"Permohonan {app_id} telah diluluskan.")


@router.post("/applications/{app_id}/reject")
async def reject_application(app_id: str, request: Request):
    """Admin only — tolak permohonan."""
    _require_admin(request)
    body = await request.json()
    note = body.get("note", "Tidak memenuhi syarat.")
    if app_id not in _applications:
        _err("Permohonan tidak ditemui.", 404)
    _applications[app_id]["status"] = "rejected"
    _applications[app_id]["review_note"] = note
    _applications[app_id]["reviewed_at"] = datetime.utcnow().isoformat()
    return _ok(message=f"Permohonan {app_id} telah ditolak.")


# ──────────────────────────────────────────────────────────────────
#  ADMIN
# ──────────────────────────────────────────────────────────────────

# Admin session store (production: guna Redis + proper auth)
_admin_sessions: set = set()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "jodohku-admin-2026")

def _require_admin(request: Request):
    auth = request.headers.get("X-Admin-Token", "")
    if not auth or auth not in _admin_sessions:
        raise HTTPException(401, detail={"success": False, "error": "Akses ditolak. Log masuk sebagai admin."})

class AdminLoginBody(BaseModel):
    username: str
    password: str

@router.post("/admin/login")
async def admin_login(data: AdminLoginBody):
    if data.username != ADMIN_USERNAME or data.password != ADMIN_PASSWORD:
        _err("Nama pengguna atau kata laluan tidak betul.", 401)
    token = "adm_" + hashlib.sha256(f"{data.username}{data.password}{datetime.utcnow().date()}".encode()).hexdigest()[:32]
    _admin_sessions.add(token)
    return _ok(admin_token=token, message="Log masuk admin berjaya.")


@router.get("/admin/users")
async def admin_list_users(request: Request, page: int = 1, limit: int = 20, search: str = "", db: Session = Depends(get_db)):
    _require_admin(request)
    q = db.query(User)
    if search:
        q = q.filter(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.phone.ilike(f"%{search}%"))
        )
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page-1)*limit).limit(limit).all()
    return _ok(
        users=[_user_to_dict(u) for u in users],
        total=total, page=page, limit=limit, pages=(total + limit - 1) // limit,
    )


@router.get("/admin/users/{uid}")
async def admin_get_user(uid: str, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        _err("Pengguna tidak ditemui.", 404)
    d = _user_to_dict(user)
    d["phone"] = user.phone
    d["is_banned"] = user.is_banned
    d["psy_answers"] = user.psy_answers
    d["ic_verified_status"] = user.ic_verified if hasattr(user, "ic_verified") else None
    return _ok(user=d)


class AdminUserPatch(BaseModel):
    tier: Optional[str] = None
    is_banned: Optional[bool] = None
    is_verified: Optional[bool] = None
    ic_verified: Optional[str] = None
    note: Optional[str] = None

@router.patch("/admin/users/{uid}")
async def admin_patch_user(uid: str, data: AdminUserPatch, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        _err("Pengguna tidak ditemui.", 404)

    if data.tier is not None:
        tier_map = {"silver": "Silver (7-Hari)", "gold": "Gold", "platinum": "Platinum", "sovereign": "Sovereign", "basic": "Basic"}
        user.tier = tier_map.get(data.tier.lower(), data.tier)
        user.is_premium = data.tier.lower() not in ("basic", "percuma")
    if data.is_banned is not None:
        user.is_banned = data.is_banned
        user.is_active = not data.is_banned
    if data.is_verified is not None:
        user.is_verified = data.is_verified
    if data.ic_verified is not None:
        try: user.ic_verified = data.ic_verified
        except: pass
    db.commit()
    return _ok(message="Pengguna dikemaskini.", user=_user_to_dict(user))


@router.get("/admin/ic-pending")
async def admin_ic_pending(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    users = db.query(User).filter(User.ic_verified == "pending").all()
    result = []
    for u in users:
        d = _user_to_dict(u)
        d["phone"] = u.phone
        d["photo_url"] = u.photo_url
        result.append(d)
    return _ok(pending=result, total=len(result))


@router.get("/admin/stats")
async def admin_stats(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    pioneer = db.query(PioneerStats).first()
    total_apps = len(_applications)
    pending_apps = sum(1 for a in _applications.values() if a["status"] == "pending")
    return _ok(stats={
        "total_users": db.query(User).count(),
        "premium_users": db.query(User).filter(User.is_premium == True).count(),
        "verified_users": db.query(User).filter(User.is_verified == True).count(),
        "total_matches": db.query(Match).count(),
        "total_messages": db.query(ChatMessage).count(),
        "pioneer_claimed": pioneer.claimed if pioneer else 0,
        "pioneer_remaining": (pioneer.total_quota - pioneer.claimed) if pioneer else 3000,
        "pending_ic": db.query(User).filter(User.ic_verified == "pending").count(),
        "total_applications": total_apps,
        "pending_applications": pending_apps,
        "asnaf_applications": sum(1 for a in _applications.values() if a["type"] == "asnaf"),
        "mualaf_applications": sum(1 for a in _applications.values() if a["type"] == "mualaf"),
    })
