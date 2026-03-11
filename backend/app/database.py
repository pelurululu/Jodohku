"""
JODOHKU — database.py
SQLAlchemy ORM — 9 tables. Added ic_verified column to User.
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import logging

from app.config import settings

logger = logging.getLogger("jodohku.db")

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ═══════════════════════════════════════════
#  STATE → DB FIELD MAP (for frontend devs)
# ═══════════════════════════════════════════
#  S.uid          → User.uid
#  S.name         → User.full_name
#  S.dob          → User.dob
#  S.gender       → User.gender
#  S.status       → User.status
#  S.state        → User.state_residence
#  S.tier         → User.tier
#  S.premium      → User.is_premium
#  S.msgCount     → User.msg_count
#  S.photo        → User.photo_url
#  S.icVerified   → User.ic_verified  ← NEW
#  S.psyDone      → User.psy_done
#  S.psyScore     → User.psy_score
#  S.psyType      → User.psy_type
#  S.psyDesc      → User.psy_desc
#  S.psyTraits    → User.psy_traits (JSON)
#  S.psyDims      → User.psy_dims (JSON)
#  S.education    → User.education
#  S.occupation   → User.occupation


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String(20), unique=True, index=True)
    phone = Column(String(20), unique=True, index=True)
    full_name = Column(String(100))
    dob = Column(String(10), default="")
    age = Column(Integer, default=0)
    gender = Column(String(15), default="Lelaki")
    status = Column(String(30), default="Bujang")
    state_residence = Column(String(50), default="")
    email = Column(String(120), default="", index=True)  # indexed for email OTP lookup
    ic_last4 = Column(String(4), default="")
    photo_url = Column(Text, default="")

    # Progressive profile
    education = Column(String(50), default="")
    occupation = Column(String(50), default="")
    income_class = Column(String(10), default="")
    wingman_verdict = Column(Text, default="")

    # Subscription
    tier = Column(String(30), default="Basic")
    is_premium = Column(Boolean, default=False)
    msg_count = Column(Integer, default=0)

    # Psychometric
    psy_done = Column(Boolean, default=False)
    psy_score = Column(Float, default=0.0)
    psy_type = Column(String(100), default="")
    psy_desc = Column(Text, default="")
    psy_traits = Column(JSON, default=[])
    psy_dims = Column(JSON, default={})
    psy_answers = Column(JSON, default={})
    psy_custom_text = Column(Text, default="")

    # Verification
    is_pioneer = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)   # Admin-verified identity (legacy)
    ic_verified = Column(String(20), default="")   # "", "pending", "verified", "rejected"  ← NEW
    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(120), index=True)   # phone number OR email address
    otp_code = Column(String(6))
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow().__class__.utcnow())  # set explicitly on create


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    tier = Column(String(30), default="Basic")
    status = Column(String(20), default="Inactive")  # Trial/Active/Expired
    price_paid = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), index=True)
    compatibility_score = Column(Float, default=0.0)
    ai_verdict = Column(Text, default="")
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class MatchAction(Base):
    __tablename__ = "match_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String(10))  # LIKE / PASS
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    match_id = Column(String(50), index=True)
    message_text = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyFeed(Base):
    __tablename__ = "daily_feeds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    feed_date = Column(String(10), index=True)
    candidates = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_uid = Column(String(20), index=True)
    tier = Column(String(30))
    amount = Column(Float)
    billcode = Column(String(100), default="")
    status = Column(String(20), default="Pending")  # Pending/Completed/Failed
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PioneerStats(Base):
    __tablename__ = "pioneer_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    total_quota = Column(Integer, default=3000)
    claimed = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ═══════════════════════════════════════════
#  DB INIT
# ═══════════════════════════════════════════
def init_db():
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    logger.info("[DB] ✅ Jadual disemak/dicipta.")


def _run_migrations():
    """Add new columns to existing DBs without dropping data."""
    from sqlalchemy import text, inspect
    try:
        inspector = inspect(engine)
        existing_cols = [c["name"] for c in inspector.get_columns("users")]

        with engine.connect() as conn:
            # Add ic_verified if missing
            if "ic_verified" not in existing_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN ic_verified VARCHAR(20) DEFAULT ''"))
                conn.commit()
                logger.info("[DB-MIGRATE] Added column: users.ic_verified")

            # Add email index if column exists but no index
            if "email" in existing_cols:
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
                    conn.commit()
                except Exception:
                    pass  # Index may already exist

    except Exception as e:
        logger.warning(f"[DB-MIGRATE] {e}")


def seed_demo_data():
    """Seed PioneerStats and demo users if DB is empty."""
    db = SessionLocal()
    try:
        if not db.query(PioneerStats).first():
            db.add(PioneerStats(total_quota=3000, claimed=847))
            db.commit()
            logger.info("[SEED] PioneerStats dicipta.")
    finally:
        db.close()