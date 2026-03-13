"""
JODOHKU — database.py
SQLAlchemy ORM — 9 tables. Matches all routes exactly.
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
    email = Column(String(120), default="", index=True)
    ic_last4 = Column(String(4), default="")
    photo_url = Column(Text, default="")

    education = Column(String(50), default="")
    occupation = Column(String(50), default="")
    income_class = Column(String(10), default="")
    wingman_verdict = Column(Text, default="")

    tier = Column(String(30), default="Basic")
    is_premium = Column(Boolean, default=False)
    msg_count = Column(Integer, default=0)

    psy_done = Column(Boolean, default=False)
    psy_score = Column(Float, default=0.0)
    psy_type = Column(String(100), default="")
    psy_desc = Column(Text, default="")
    psy_traits = Column(JSON, default=[])
    psy_dims = Column(JSON, default={})
    psy_answers = Column(JSON, default={})
    psy_custom_text = Column(Text, default="")

    is_pioneer = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    ic_verified = Column(String(20), default="")
    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(120), index=True)
    otp_code = Column(String(6))
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    tier = Column(String(30), default="Basic")
    status = Column(String(20), default="Inactive")
    price_paid = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_uid = Column(String(30), unique=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id"), index=True)
    user2_id = Column(Integer, ForeignKey("users.id"), index=True)
    compatibility_score = Column(Float, default=0.0)
    ai_verdict = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    advance_requested = Column(Boolean, default=False)
    advance_approved = Column(Boolean, default=False)
    chat_day_list = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])


class MatchAction(Base):
    __tablename__ = "match_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    candidate_id = Column(String(20))
    action = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String(30), index=True)
    sender_uid = Column(String(20))
    message_text = Column(Text)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyFeed(Base):
    __tablename__ = "daily_feeds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_uid = Column(String(20), index=True)
    candidate_uid = Column(String(20))
    compatibility_score = Column(Float, default=0.0)
    ai_verdict = Column(Text, default="")
    feed_date = Column(String(10))
    is_actioned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_uid = Column(String(20), index=True)
    tier = Column(String(30))
    amount = Column(Float)
    currency = Column(String(5), default="MYR")
    method = Column(String(30), default="ToyyibPay")
    billcode = Column(String(100), default="")
    status = Column(String(20), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class PioneerStats(Base):
    __tablename__ = "pioneer_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    total_quota = Column(Integer, default=3000)
    claimed = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    logger.info("[DB] ✅ Jadual disemak/dicipta.")


def seed_demo_data():
    db = SessionLocal()
    try:
        if not db.query(PioneerStats).first():
            db.add(PioneerStats(total_quota=3000, claimed=847))
            db.commit()
            logger.info("[SEED] PioneerStats dicipta.")
    finally:
        db.close()