"""
JODOHKU — routes_payment.py
Frontend baris 1032: doPayment(tier,price) — currently simulated client-side.
Backend menyediakan endpoint untuk integrasi ToyyibPay sebenar.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

from app.database import get_db, User, Subscription, Payment
from app.config import settings
from app.crm import build_upgrade_payload, fire_to_makecom

router = APIRouter()
logger = logging.getLogger("jodohku.pay")

TIER_PRICES = {
    "Silver": 19.99,
    "Silver (7-Hari)": 0.0,      # Trial — percuma
    "Gold": 59.99,
    "Platinum": 299.99,
    "Sovereign": 4999.00,        # Tahunan
}

TIER_LIMITS = {
    "Silver": 10,                # Frontend FREE_MSGS=10
    "Silver (7-Hari)": 10,
    "Gold": 999999,
    "Platinum": 999999,
    "Sovereign": 999999,
}

class PaymentCreateBody(BaseModel):
    user_uid: str
    tier: str
    amount: float

class ToyyibPayCallbackBody(BaseModel):
    billcode: str = ""
    order_id: str = ""
    status_id: str = ""
    transaction_id: str = ""


# ═══════════════════════════════════════════
#  POST /payment/create-bill
#  Cipta bil pembayaran di ToyyibPay
# ═══════════════════════════════════════════
@router.post("/payment/create-bill")
async def create_bill(data: PaymentCreateBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    payment = Payment(
        user_uid=data.user_uid, tier=data.tier, amount=data.amount,
    )
    db.add(payment)
    db.commit()

    # ══════════════════════════════════════════
    # [DEVELOPER] INTEGRASI TOYYIBPAY
    # Uncomment dan isi credentials di .env
    # ══════════════════════════════════════════
    # import httpx
    # tp_url = f"{settings.TOYYIBPAY_URL}/index.php/api/createBill"
    # tp_data = {
    #     "userSecretKey": settings.TOYYIBPAY_SECRET,
    #     "categoryCode": settings.TOYYIBPAY_CATEGORY,
    #     "billName": f"Jodohku {data.tier}",
    #     "billDescription": f"Langganan {data.tier} Jodohku",
    #     "billPriceSetting": 1,
    #     "billPayorInfo": 1,
    #     "billAmount": int(data.amount * 100),
    #     "billReturnUrl": "https://yourdomain.com/payment/return",
    #     "billCallbackUrl": "https://yourdomain.com/payment/callback",
    #     "billExternalReferenceNo": f"JDK-{payment.id}",
    #     "billTo": user.full_name,
    #     "billEmail": user.email or "user@jodohku.com",
    #     "billPhone": user.phone,
    # }
    # async with httpx.AsyncClient() as client:
    #     resp = await client.post(tp_url, data=tp_data)
    #     result = resp.json()
    #     if result and len(result) > 0:
    #         billcode = result[0].get("BillCode", "")
    #         payment.billcode = billcode
    #         db.commit()
    #         return {"payment_url": f"{settings.TOYYIBPAY_URL}/{billcode}", "billcode": billcode}

    return {
        "payment_id": payment.id,
        "amount": data.amount,
        "tier": data.tier,
        "billcode": f"JDK-DEMO-{payment.id}",
        "payment_url": f"https://dev.toyyibpay.com/JDK-DEMO-{payment.id}",
        "note": "ToyyibPay belum disambung. Sambungkan TOYYIBPAY_SECRET dalam .env untuk pembayaran sebenar.",
    }


# ═══════════════════════════════════════════
#  POST /payment/callback — ToyyibPay callback
# ═══════════════════════════════════════════
@router.post("/payment/callback")
async def payment_callback(data: ToyyibPayCallbackBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if data.status_id == "1":  # Berjaya
        payment = db.query(Payment).filter(Payment.billcode == data.billcode).first()
        if payment:
            payment.status = "Completed"
            payment.completed_at = datetime.utcnow()

            user = db.query(User).filter(User.uid == payment.user_uid).first()
            if user:
                user.tier = payment.tier
                user.is_premium = True
                user.msg_count = 0

                sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
                if sub:
                    sub.tier = payment.tier
                    sub.status = "Active"
                    sub.price_paid = payment.amount
                    sub.started_at = datetime.utcnow()
                    sub.expires_at = datetime.utcnow() + timedelta(days=30)

            db.commit()
            logger.info(f"[PAY] ✅ {payment.tier} — RM{payment.amount}")

    return {"status": "ok"}


# ═══════════════════════════════════════════
#  POST /payment/upgrade — Naik taraf tier pengguna
# ═══════════════════════════════════════════
@router.post("/payment/upgrade")
async def upgrade(data: PaymentCreateBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    # Guna harga canonical dari TIER_PRICES; fall back to data.amount jika tier tidak dikenali
    expected_price = TIER_PRICES.get(data.tier, data.amount)
    days = 365 if data.tier == "Sovereign" else 30

    user.tier = data.tier
    user.is_premium = True
    user.msg_count = 0

    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if sub:
        sub.tier = data.tier
        sub.status = "Active"
        sub.price_paid = expected_price
        sub.started_at = datetime.utcnow()
        sub.expires_at = datetime.utcnow() + timedelta(days=days)
    else:
        sub = Subscription(
            user_id=user.id, tier=data.tier, status="Active",
            price_paid=expected_price, started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=days),
        )
        db.add(sub)

    db.commit()

    # CRM
    crm = build_upgrade_payload({
        "full_name": user.full_name, "phone": user.phone,
        "tier": data.tier, "amount": expected_price,
        "upgraded_at": datetime.utcnow().isoformat(),
    })
    bg.add_task(fire_to_makecom, crm, settings.MAKE_WEBHOOK_URL)

    return {
        "status": "Success",
        "tier": data.tier,
        "is_premium": True,
        "expires_days": days,
    }
