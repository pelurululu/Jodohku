"""
JODOHKU — routes_payment.py
ToyyibPay integration — PRODUCTION
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging, httpx, hashlib

from app.database import get_db, User, Subscription, Payment
from app.config import settings
from app.crm import build_upgrade_payload, fire_to_makecom

router = APIRouter()
logger = logging.getLogger("jodohku.pay")

TIER_PRICES = {
    "Silver": 19.99,
    "Silver (7-Hari)": 0.0,
    "Gold": 59.99,
    "Platinum": 299.99,
    "Sovereign": 4999.00,
}

class PaymentCreateBody(BaseModel):
    user_uid: str
    tier: str
    amount: float


# ═══════════════════════════════════════════
#  POST /payment/create-bill
# ═══════════════════════════════════════════
@router.post("/payment/create-bill")
async def create_bill(data: PaymentCreateBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    # Save payment record first
    payment = Payment(
        user_uid=data.user_uid, tier=data.tier, amount=data.amount,
    )
    db.add(payment)
    db.commit()

    # If ToyyibPay not configured yet
    if not settings.TOYYIBPAY_SECRET or not settings.TOYYIBPAY_CATEGORY:
        logger.warning("[PAY] ToyyibPay belum dikonfigurasi")
        raise HTTPException(503, detail="Sistem pembayaran belum dikonfigurasi. Hubungi admin.")

    # Create bill at ToyyibPay
    tp_url = f"{settings.TOYYIBPAY_URL}/index.php/api/createBill"
    bill_name = f"Jodohku_{data.tier}".replace(" ", "_")[:30]
    bill_desc = f"Langganan_{data.tier}_Jodohku".replace(" ", "_")[:100]

    tp_data = {
        "userSecretKey": settings.TOYYIBPAY_SECRET,
        "categoryCode": settings.TOYYIBPAY_CATEGORY,
        "billName": bill_name,
        "billDescription": bill_desc,
        "billPriceSetting": 1,
        "billPayorInfo": 1,
        "billAmount": int(data.amount * 100),  # in cents
        "billReturnUrl": f"{settings.FRONTEND_URL or 'https://jodohku.netlify.app'}",
        "billCallbackUrl": f"{settings.BACKEND_URL or 'https://jodohku-api.onrender.com'}/payment/callback",
        "billExternalReferenceNo": f"JDK-{payment.id}",
        "billTo": user.full_name,
        "billEmail": user.email or "",
        "billPhone": user.phone,
        "billPaymentChannel": 2,  # FPX + Credit Card
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
                logger.info(f"[PAY] Bill cipta: {billcode} — {data.tier} RM{data.amount}")
                return {
                    "payment_url": f"{settings.TOYYIBPAY_URL}/{billcode}",
                    "billcode": billcode,
                    "tier": data.tier,
                    "amount": data.amount,
                }
            else:
                logger.error(f"[PAY] ToyyibPay response: {result}")
                raise HTTPException(500, detail="Gagal mencipta bil ToyyibPay.")

    except httpx.TimeoutException:
        raise HTTPException(504, detail="ToyyibPay tidak bertindak balas. Cuba lagi.")
    except Exception as e:
        logger.error(f"[PAY] Error: {e}")
        raise HTTPException(500, detail="Gagal mencipta bil. Cuba lagi.")


# ═══════════════════════════════════════════
#  POST /payment/callback — ToyyibPay callback
#  ToyyibPay sends: refno, status, reason,
#  billcode, order_id, amount, hash
# ═══════════════════════════════════════════
@router.post("/payment/callback")
async def payment_callback(request: Request, bg: BackgroundTasks, db: Session = Depends(get_db)):
    form = await request.form()
    refno    = form.get("refno", "")
    status   = form.get("status", "")
    order_id = form.get("order_id", "")
    billcode = form.get("billcode", "")
    amount   = form.get("amount", "")
    received_hash = form.get("hash", "")

    logger.info(f"[PAY-CB] billcode={billcode} status={status} refno={refno}")

    # Validate hash — MD5(userSecretKey + status + order_id + refno + "ok")
    if settings.TOYYIBPAY_SECRET and received_hash:
        expected_hash = hashlib.md5(
            f"{settings.TOYYIBPAY_SECRET}{status}{order_id}{refno}ok".encode()
        ).hexdigest()
        if received_hash != expected_hash:
            logger.warning(f"[PAY-CB] Hash tidak sah — {billcode}")
            return {"status": "invalid hash"}

    # status 1 = success
    if status == "1":
        payment = db.query(Payment).filter(Payment.billcode == billcode).first()
        if payment and payment.status != "Completed":
            payment.status = "Completed"
            payment.completed_at = datetime.utcnow()

            user = db.query(User).filter(User.uid == payment.user_uid).first()
            if user:
                days = 365 if payment.tier == "Sovereign" else 30
                user.tier = payment.tier
                user.is_premium = True
                user.msg_count = 0

                sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
                if sub:
                    sub.tier = payment.tier
                    sub.status = "Active"
                    sub.price_paid = payment.amount
                    sub.started_at = datetime.utcnow()
                    sub.expires_at = datetime.utcnow() + timedelta(days=days)
                else:
                    sub = Subscription(
                        user_id=user.id, tier=payment.tier, status="Active",
                        price_paid=payment.amount, started_at=datetime.utcnow(),
                        expires_at=datetime.utcnow() + timedelta(days=days),
                    )
                    db.add(sub)

                db.commit()
                logger.info(f"[PAY] ✅ {user.full_name} → {payment.tier} RM{payment.amount}")

                crm = build_upgrade_payload({
                    "full_name": user.full_name, "phone": user.phone,
                    "tier": payment.tier, "amount": float(payment.amount),
                    "upgraded_at": datetime.utcnow().isoformat(),
                })
                bg.add_task(fire_to_makecom, crm, settings.MAKE_WEBHOOK_URL)

    return {"status": "ok"}


# ═══════════════════════════════════════════
#  POST /payment/upgrade — direct (no payment)
#  For testing or manual upgrade by admin
# ═══════════════════════════════════════════
@router.post("/payment/upgrade")
async def upgrade(data: PaymentCreateBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

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

    crm = build_upgrade_payload({
        "full_name": user.full_name, "phone": user.phone,
        "tier": data.tier, "amount": expected_price,
        "upgraded_at": datetime.utcnow().isoformat(),
    })
    bg.add_task(fire_to_makecom, crm, settings.MAKE_WEBHOOK_URL)

    return {"status": "Success", "tier": data.tier, "is_premium": True, "expires_days": days}