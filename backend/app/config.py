"""JODOHKU — config.py"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Jodohku"
    DEBUG: bool = True
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./jodohku.db"
    JWT_SECRET: str = "jodohku-kunci-rahsia-tukar-ini"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080
    # ══════════════════════════════════════════════════════
    # CRM — ARAHAN UNTUK DEVELOPER
    # Sila isi kunci API di bawah sebelum deploy ke production.
    # Rujuk /docs/CRM_SETUP.md untuk panduan lengkap.
    # ══════════════════════════════════════════════════════
    MAKE_WEBHOOK_URL: str = ""          # Make.com webhook URL
    AIRTABLE_API_KEY: str = ""          # Airtable Personal Access Token
    AIRTABLE_BASE_ID: str = ""          # Airtable Base ID
    AIRTABLE_TABLE: str = "Jodohku Command Center"
    WHATSAPP_TOKEN: str = ""            # Meta WhatsApp Business API token
    WHATSAPP_PHONE_ID: str = ""         # Meta phone number ID
    TOYYIBPAY_SECRET: str = ""          # ToyyibPay secret key
    TOYYIBPAY_CATEGORY: str = ""        # ToyyibPay category code
    TOYYIBPAY_URL: str = "https://dev.toyyibpay.com"
    FRONTEND_URL: str = ""
    BACKEND_URL: str = ""
    S3_BUCKET: str = ""
    S3_REGION: str = "ap-southeast-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    PIONEER_QUOTA: int = 3000
    PIONEER_TRIAL_DAYS: int = 7
    FREE_MSG_LIMIT: int = 10           # Frontend: FREE_MSGS=10 (Silver tier, 10 mesej)
    DAILY_CANDIDATES: int = 5
    DAILY_RESET_HOUR: int = 8          # Frontend baris 677: DAILY_RESET_HOUR=8
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()