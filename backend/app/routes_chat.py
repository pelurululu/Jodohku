"""
JODOHKU — routes_chat.py

  Frontend baris 991-1018: sendMsg() → apiCall('POST','/chat/send-message', {sender_id, match_id, message_text})
  
  Anti-scam sudah ada di frontend (baris 727-728), tapi backend juga wajib validate.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import re, logging

from app.database import get_db, User, ChatMessage, Match
from app.config import settings

router = APIRouter()
logger = logging.getLogger("jodohku.chat")

# Anti-scam patterns — SAMA macam frontend baris 727
SCAM_PATTERNS = [
    r"\b(whatsapp|telegram|signal)\b.*\b(luar|outside|direct)\b",
    r"\b(wang|money|rm\d+|transfer|bayar|pay)\b",
    r"\b(pelaburan|investment|profit|untung)\b",
    r"bit\.ly|tinyurl|t\.me/|wa\.me/",
    r"\b(atm|bank|akaun|account.?number)\b",
]


class ChatSendBody(BaseModel):
    """Frontend baris 999: {sender_id, match_id, message_text}"""
    sender_id: str      # S.uid (string)
    match_id: str       # match_uid atau S.activeMatch.id
    message_text: str


# ═══════════════════════════════════════════════════
#  POST /chat/send-message
#  Frontend baris 999
# ═══════════════════════════════════════════════════
@router.post("/chat/send-message")
async def send_message(data: ChatSendBody, db: Session = Depends(get_db)):
    # Anti-scam validation (backend layer)
    for pat in SCAM_PATTERNS:
        if re.search(pat, data.message_text, re.IGNORECASE):
            raise HTTPException(400, detail="Mesej mengandungi kandungan berpotensi penipuan.")

    if not data.message_text.strip():
        raise HTTPException(400, detail="Mesej tidak boleh kosong.")
    if len(data.message_text) > 2000:
        raise HTTPException(400, detail="Mesej terlalu panjang.")

    # Semak had mesej
    user = db.query(User).filter(User.uid == data.sender_id).first()
    if user and not user.is_premium:
        if user.msg_count >= settings.FREE_MSG_LIMIT:
            raise HTTPException(403, detail="Had mesej percuma tercapai. Sila naik taraf tier.")
        user.msg_count += 1

    # Simpan mesej
    msg = ChatMessage(
        match_id=data.match_id,
        sender_uid=data.sender_id,
        message_text=data.message_text,
    )
    db.add(msg)

    # Kemaskini chat days pada match (untuk advance relationship feature)
    match = db.query(Match).filter(Match.match_uid == data.match_id).first()
    if match:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        days = match.chat_day_list or []
        if today not in days:
            days.append(today)
            match.chat_day_list = days

    db.commit()

    return {
        "status": "Success",
        "msg_id": msg.id,
        "msg_count": user.msg_count if user else 0,
    }


# ═══════════════════════════════════════════════════
#  GET /chat/{match_id}/messages
#  Untuk mendapatkan sejarah mesej (opsional, frontend simpan dalam localStorage)
# ═══════════════════════════════════════════════════
@router.get("/chat/{match_id}/messages")
async def get_messages(match_id: str, db: Session = Depends(get_db)):
    msgs = db.query(ChatMessage).filter(
        ChatMessage.match_id == match_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {
        "messages": [{
            "id": m.id,
            "sender_uid": m.sender_uid,
            "message_text": m.message_text,
            "is_system": m.is_system,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        } for m in msgs]
    }


# ═══════════════════════════════════════════════════
#  POST /chat/request-advance
#  Frontend baris 972: requestAdvance()
# ═══════════════════════════════════════════════════
@router.post("/chat/request-advance")
async def request_advance(match_id: str, user_uid: str, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.match_uid == match_id).first()
    if not match:
        raise HTTPException(404, detail="Padanan tidak ditemui.")

    match.advance_requested = True
    db.commit()

    logger.info(f"[ADVANCE] 💕 {user_uid} mohon perkenalan lanjut untuk {match_id}")
    return {"status": "Success", "message": "Permohonan perkenalan lanjut dihantar."}


# ═══════════════════════════════════════════════════
#  POST /chat/request-whatsapp
#  Frontend baris 982: requestWhatsApp()
# ═══════════════════════════════════════════════════
@router.post("/chat/request-whatsapp")
async def request_whatsapp(match_id: str, requester_uid: str, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.match_uid == match_id).first()
    if not match:
        raise HTTPException(404, detail="Padanan tidak ditemui.")

    # Sahkan requester adalah ahli Platinum atau Sovereign
    user = db.query(User).filter(User.uid == requester_uid).first()
    if user and user.tier not in ("Platinum", "Sovereign"):
        raise HTTPException(403, detail="Ciri ini hanya untuk ahli Platinum atau Sovereign.")

    logger.info(f"[WA-REQ] 📞 {requester_uid} mohon nombor WhatsApp untuk match {match_id}")

    return {
        "status": "Success",
        "message": "Permohonan dihantar. Menunggu persetujuan pihak lain.",
    }
