"""
JODOHKU — database.py
Setiap field dalam model ini dipetakan kepada state frontend S{} (baris 681-692).

Frontend S{} keys → Database columns:
  S.uid          → User.uid
  S.tok          → (JWT token, dijana semasa login)
  S.name         → User.full_name
  S.dob          → User.dob
  S.gender       → User.gender
  S.status       → User.status (Bujang/Janda/Duda)
  S.state        → User.state_residence
  S.tier         → User.tier
  S.premium      → User.is_premium
  S.msgCount     → User.msg_count
  S.subStart     → Subscription.started_at
  S.subEnd       → Subscription.expires_at
  S.photo        → User.photo_b64 (base64 dari frontend)
  S.psyDone      → User.psy_done
  S.psyScore     → User.psy_score
  S.psyType      → User.psy_type
  S.psyDesc      → User.psy_desc
  S.psyTraits    → User.psy_traits (JSON)
  S.psyDims      → User.psy_dims (JSON)
  S.psyCustomText → User.psy_custom_text
  S.matches      → Match table
  S.history      → ChatMessage table
  S.chatDays     → Match.chat_day_list (JSON)
  S.advanceRequested → Match.advance_requested
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timedelta
import random, string, logging
from app.config import settings

logger = logging.getLogger("jodohku.db")

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ═══════════════════════════════════════════════════
#  USER — Semua maklumat pengguna
#  Dipanggil oleh:
#    POST /auth/register (baris 743)
#    POST /auth/whatsapp/verify-otp (baris 751)
#    GET /user/{uid}/profile
# ═══════════════════════════════════════════════════
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String(20), unique=True, index=True)  # "JDK-XXXXX" atau "jdk_timestamp"
    phone = Column(String(20), unique=True, index=True)
    full_name = Column(String(100))
    dob = Column(String(10), default="")   # "YYYY-MM-DD" — frontend hantar dob mentah
    age = Column(Integer, default=0)
    gender = Column(String(15), default="Lelaki")
    status = Column(String(30), default="Bujang")  # Bujang/Janda/Duda
    state_residence = Column(String(50), default="")
    email = Column(String(120), default="")
    ic_last4 = Column(String(4), default="")

    # Foto — frontend simpan base64 dalam S.photo
    # Production: upload ke S3, simpan URL sahaja
    photo_url = Column(Text, default="")

    # Progressive Profiling — dikumpul dari modal selepas daftar/login
    # Maps to: S.education, S.occupation, S.income, S.wingmanVerdict
    education = Column(String(50), default="")        # SPM/Diploma/Degree/Master/PhD/Profesional
    occupation = Column(String(50), default="")       # Doktor/Jurutera/Akauntan/dll
    income_class = Column(String(10), default="")     # B40/M40/T20/VVIP
    wingman_verdict = Column(Text, default="")        # Analisis AI Wingman (teks santai)

    # Tier & Langganan — maps to S.tier, S.premium, S.msgCount
    tier = Column(String(30), default="Basic")
    is_premium = Column(Boolean, default=False)
    msg_count = Column(Integer, default=0)

    # Psikometrik 30 Dimensi — maps to S.psyDone..S.psyCustomText
    psy_done = Column(Boolean, default=False)
    psy_score = Column(Float, default=0.0)
    psy_type = Column(String(100), default="")
    psy_desc = Column(Text, default="")
    psy_traits = Column(JSON, default=[])
    psy_dims = Column(JSON, default={})
    psy_answers = Column(JSON, default={})  # Jawapan mentah {q1:{val,score},...}
    psy_custom_text = Column(Text, default="")  # Keperibadian tambahan

    # Pioneer
    is_pioneer = Column(Boolean, default=False)

    # Metadata
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)

    subscription = relationship("Subscription", back_populates="user", uselist=False)


# ═══════════════════════════════════════════════════
#  OTP — Pengesahan WhatsApp
#  POST /auth/whatsapp/request-otp (baris 749)
#  POST /auth/whatsapp/verify-otp (baris 751)
# ═══════════════════════════════════════════════════
class OTPRecord(Base):
    __tablename__ = "otp_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), index=True)
    otp_code = Column(String(6))
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(minutes=5))


# ═══════════════════════════════════════════════════
#  SUBSCRIPTION — maps to S.subStart, S.subEnd
#  Frontend baris 745: setSubDays(days)
# ═══════════════════════════════════════════════════
class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    tier = Column(String(30), default="Silver (7-Hari)")
    status = Column(String(20), default="Trial")  # Trial/Active/Expired
    price_paid = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    user = relationship("User", back_populates="subscription")


# ═══════════════════════════════════════════════════
#  MATCH — maps to S.matches[]
#  Dicipta apabila mutual LIKE
#  Frontend baris 882: S.matches.push({id,name,score,photo,traits})
# ═══════════════════════════════════════════════════
class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, autoincrement=True)
    match_uid = Column(String(30), unique=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"))
    user2_id = Column(Integer, ForeignKey("users.id"))
    compatibility_score = Column(Float, default=0.0)
    ai_verdict = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    advance_requested = Column(Boolean, default=False)  # S.advanceRequested
    advance_approved = Column(Boolean, default=False)
    chat_day_list = Column(JSON, default=[])  # S.chatDays[matchId]
    created_at = Column(DateTime, default=datetime.utcnow)
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])


# ═══════════════════════════════════════════════════
#  MATCH ACTION — LIKE/PASS
#  POST /matchmaking/action (baris 870)
# ═══════════════════════════════════════════════════
class MatchAction(Base):
    __tablename__ = "match_actions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    candidate_id = Column(String(20))  # uid string dari frontend
    action = Column(String(10))  # LIKE/PASS
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════
#  CHAT MESSAGE — maps to S.history[matchId]
#  POST /chat/send-message (baris 999)
# ═══════════════════════════════════════════════════
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String(30), index=True)  # match_uid
    sender_uid = Column(String(20))
    message_text = Column(Text)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════
#  DAILY FEED — cache feed harian
#  GET /matchmaking/daily-feed/{uid} (baris 803)
# ═══════════════════════════════════════════════════
class DailyFeed(Base):
    __tablename__ = "daily_feeds"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_uid = Column(String(20), index=True)
    candidate_uid = Column(String(20))
    compatibility_score = Column(Float, default=0.0)
    ai_verdict = Column(Text, default="")
    feed_date = Column(String(10))  # YYYY-MM-DD
    is_actioned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════
#  PAYMENT — Rekod pembayaran
# ═══════════════════════════════════════════════════
class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_uid = Column(String(20))
    tier = Column(String(30))
    amount = Column(Float)
    currency = Column(String(5), default="MYR")
    method = Column(String(30), default="ToyyibPay")
    billcode = Column(String(100), default="")
    status = Column(String(20), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


# ═══════════════════════════════════════════════════
#  PIONEER STATS
#  GET /stats/pioneer-quota (baris 1073)
# ═══════════════════════════════════════════════════
class PioneerStats(Base):
    __tablename__ = "pioneer_stats"
    id = Column(Integer, primary_key=True, autoincrement=True)
    total_quota = Column(Integer, default=3000)
    claimed = Column(Integer, default=0)


# ═══════════════════════════════════════════════════
#  INIT & SEED
# ═══════════════════════════════════════════════════
def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(PioneerStats).first():
            db.add(PioneerStats(total_quota=settings.PIONEER_QUOTA, claimed=0))
            db.commit()
    finally:
        db.close()
    logger.info("[DB] ✅ Jadual dicipta.")


def seed_demo_data():
    """
    Cipta pengguna seed supaya feed dan matching algorithm boleh berfungsi pada permulaan.
    """
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            logger.info("[SEED] Data sedia ada, langkau.")
            return

        demos = [
            # ═══ PENGGUNA SEED — PEREMPUAN ═══
            {"uid": "JDK-9120", "phone": "0191110001", "full_name": "Cik Puan Sarah",
             "age": 32, "gender": "Perempuan", "status": "Janda", "tier": "Gold",
             "is_premium": True, "psy_done": True, "psy_score": 8.8,
             "psy_type": "Pasangan Seimbang & Matang",
             "psy_traits": ["Penyabar", "Rajin Memasak", "Suka Membaca", "Kemas"],
             "psy_dims": {"agama": 9, "keluarga": 9, "kewangan": 8, "komunikasi": 8, "emosi": 9, "gaya_hidup": 8},
             "education": "Degree", "occupation": "Pensyarah", "income_class": "M40"},
            {"uid": "JDK-4055", "phone": "0191110002", "full_name": "Cik Puan Nurul",
             "age": 28, "gender": "Perempuan", "status": "Bujang", "tier": "Silver",
             "is_premium": False, "psy_done": True, "psy_score": 8.2,
             "psy_type": "Pasangan Seimbang & Matang",
             "psy_traits": ["Perancang", "Analitikal", "Suka Belajar", "Kreatif"],
             "psy_dims": {"agama": 7, "keluarga": 8, "kewangan": 9, "komunikasi": 7, "emosi": 8},
             "education": "Master", "occupation": "Akauntan", "income_class": "M40"},
            {"uid": "JDK-7203", "phone": "0191110003", "full_name": "Cik Puan Aisyah",
             "age": 35, "gender": "Perempuan", "status": "Janda", "tier": "Gold",
             "is_premium": True, "psy_done": True, "psy_score": 7.9,
             "psy_type": "Pemimpin Keluarga Berwibawa",
             "psy_traits": ["Dermawan", "Mesra", "Suka Mengembara", "Aktif Komuniti"],
             "psy_dims": {"agama": 8, "keluarga": 8, "kewangan": 7, "komunikasi": 8, "emosi": 8},
             "education": "Degree", "occupation": "Sektor Awam", "income_class": "M40"},
            {"uid": "JDK-2891", "phone": "0191110004", "full_name": "Cik Puan Hafizah",
             "age": 30, "gender": "Perempuan", "status": "Bujang", "tier": "Gold",
             "is_premium": True, "psy_done": True, "psy_score": 7.8,
             "psy_type": "Pasangan Seimbang & Matang",
             "psy_traits": ["Optimis", "Sihat", "Ceria", "Disiplin"],
             "psy_dims": {"agama": 7, "keluarga": 7, "kewangan": 8, "komunikasi": 8, "emosi": 7},
             "education": "Degree", "occupation": "Doktor/Medikal", "income_class": "T20"},
            {"uid": "JDK-5514", "phone": "0191110005", "full_name": "Cik Puan Rozita",
             "age": 38, "gender": "Perempuan", "status": "Janda", "tier": "Platinum",
             "is_premium": True, "psy_done": True, "psy_score": 7.5,
             "psy_type": "Pemimpin Keluarga Berwibawa",
             "psy_traits": ["Setia", "Bijak Kewangan", "Introvert", "Penyayang"],
             "psy_dims": {"agama": 8, "keluarga": 9, "kewangan": 9, "komunikasi": 6, "emosi": 7},
             "education": "Master", "occupation": "Business", "income_class": "T20"},
            # ═══ PENGGUNA SEED — LELAKI ═══
            {"uid": "JDK-4421", "phone": "0191110006", "full_name": "Encik Ahmad",
             "age": 34, "gender": "Lelaki", "status": "Bujang", "tier": "Gold",
             "is_premium": True, "psy_done": True, "psy_score": 8.7,
             "psy_type": "Pemimpin Keluarga Berwibawa",
             "psy_traits": ["Bertanggungjawab", "Spiritual", "Kerjaya Stabil", "Suka Memasak"],
             "psy_dims": {"agama": 9, "keluarga": 9, "kewangan": 8, "komunikasi": 8, "emosi": 8},
             "education": "Degree", "occupation": "Jurutera", "income_class": "M40"},
            {"uid": "JDK-6630", "phone": "0191110007", "full_name": "Encik Hakim",
             "age": 29, "gender": "Lelaki", "status": "Bujang", "tier": "Silver",
             "is_premium": False, "psy_done": True, "psy_score": 8.1,
             "psy_type": "Pasangan Seimbang & Matang",
             "psy_traits": ["Matang", "Sportif", "Perancang", "Komunikatif"],
             "psy_dims": {"agama": 7, "keluarga": 8, "kewangan": 8, "komunikasi": 8, "emosi": 7},
             "education": "Diploma", "occupation": "Sales/Marketing", "income_class": "B40"},
            {"uid": "JDK-1182", "phone": "0191110008", "full_name": "Encik Faris",
             "age": 37, "gender": "Lelaki", "status": "Duda", "tier": "Gold",
             "is_premium": True, "psy_done": True, "psy_score": 8.0,
             "psy_type": "Pasangan Seimbang & Matang",
             "psy_traits": ["Usahawan", "Pengembara", "Penyayang Keluarga", "Stabil"],
             "psy_dims": {"agama": 8, "keluarga": 8, "kewangan": 9, "komunikasi": 7, "emosi": 8},
             "education": "Degree", "occupation": "Business", "income_class": "T20"},
            {"uid": "JDK-8845", "phone": "0191110009", "full_name": "Encik Rizal",
             "age": 32, "gender": "Lelaki", "status": "Bujang", "tier": "Silver",
             "is_premium": False, "psy_done": True, "psy_score": 7.7,
             "psy_type": "Penjelajah Hubungan",
             "psy_traits": ["Sukarelawan", "Toleran", "Suka Sejarah", "Rajin"],
             "psy_dims": {"agama": 7, "keluarga": 7, "kewangan": 7, "komunikasi": 8, "emosi": 7},
             "education": "Degree", "occupation": "Sektor Awam", "income_class": "M40"},
            {"uid": "JDK-3309", "phone": "0191110010", "full_name": "Encik Haziq",
             "age": 40, "gender": "Lelaki", "status": "Duda", "tier": "Platinum",
             "is_premium": True, "psy_done": True, "psy_score": 7.6,
             "psy_type": "Pemimpin Keluarga Berwibawa",
             "psy_traits": ["Pendiam", "Penyayang", "Kemas", "Berkebun"],
             "psy_dims": {"agama": 8, "keluarga": 8, "kewangan": 8, "komunikasi": 6, "emosi": 8},
             "education": "Master", "occupation": "Peguam", "income_class": "T20"},
        ]

        for d in demos:
            u = User(
                uid=d["uid"], phone=d["phone"], full_name=d["full_name"],
                age=d["age"], gender=d["gender"], status=d["status"],
                tier=d["tier"], is_premium=d["is_premium"],
                psy_done=d["psy_done"], psy_score=d["psy_score"],
                psy_type=d["psy_type"], psy_traits=d["psy_traits"],
                psy_dims=d["psy_dims"], is_active=True,
                education=d.get("education", ""),
                occupation=d.get("occupation", ""),
                income_class=d.get("income_class", ""),
            )
            db.add(u)
        db.commit()
        logger.info(f"[SEED] ✅ {len(demos)} pengguna demo dicipta.")
    except Exception as e:
        logger.error(f"[SEED] ❌ {e}")
        db.rollback()
    finally:
        db.close()
