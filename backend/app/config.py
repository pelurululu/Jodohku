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

    # ══ URLs ══
    FRONTEND_URL: str = "https://jodohku.netlify.app"
    BACKEND_URL: str = "https://jodohku-api.onrender.com"

    # ══ CRM ══
    MAKE_WEBHOOK_URL: str = ""
    AIRTABLE_API_KEY: str = ""
    AIRTABLE_BASE_ID: str = ""
    AIRTABLE_TABLE: str = "Jodohku Command Center"

    # ══ Email OTP (Gmail SMTP) ══
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""        # yourname@gmail.com
    EMAIL_PASSWORD: str = ""    # 16-char Gmail App Password

    # ══ ToyyibPay ══
    TOYYIBPAY_SECRET: str = ""
    TOYYIBPAY_CATEGORY: str = ""
    TOYYIBPAY_URL: str = "https://toyyibpay.com"  # Use https://dev.toyyibpay.com for staging

    # ══ WhatsApp (Legacy — kept for CRM welcome msg) ══
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""

    # ══ Storage (Supabase / S3) ══
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_IC_BUCKET: str = "ic-uploads"
    S3_BUCKET: str = ""
    S3_REGION: str = "ap-southeast-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""

    # ══ App limits ══
    PIONEER_QUOTA: int = 3000
    PIONEER_TRIAL_DAYS: int = 7
    FREE_MSG_LIMIT: int = 10
    DAILY_CANDIDATES: int = 5
    DAILY_RESET_HOUR: int = 8

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()