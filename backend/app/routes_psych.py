"""
JODOHKU — routes_psych.py
Simpan jawapan ujian 30 soalan dan jana profil personaliti server-side.

Frontend mengira skor secara client-side (baris 1207-1269),
tetapi backend JUGA wajib mengira dan menyimpan — supaya
data CRM dan matchmaking sentiasa konsisten.

Endpoint ini dipanggil selepas frontend selesai ujian,
sebelum atau selepas psyCalcResult() di frontend.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from app.database import get_db, User
from app.ai_engine import generate_personality_profile
from app.config import settings
from app.crm import build_profile_complete_payload, fire_to_makecom

router = APIRouter()
logger = logging.getLogger("jodohku.psych")


class PsychSubmitBody(BaseModel):
    """
    Frontend state yang dihantar selepas ujian selesai.
    Maps to S.psyScore, S.psyType, S.psyDesc, S.psyTraits, S.psyDims, S.psyCustomText
    """
    user_uid: str
    answers: Dict[str, Any]      # {q1:{val,score}, q2:{val,score}, ...}
    psy_score: float             # Skor kiraan frontend
    psy_type: str                # Jenis personaliti
    psy_desc: str                # Deskripsi
    psy_traits: list             # Senarai trait
    psy_dims: Dict[str, float]   # {kewangan:8.5, keluarga:9, ...}
    psy_custom_text: str = ""    # Keperibadian tambahan (baris 1202)


# ═══════════════════════════════════════════
#  POST /psych/submit-results
#  Dipanggil selepas frontend psyCalcResult()
#  Menyimpan semua data ujian ke database
# ═══════════════════════════════════════════
@router.post("/psych/submit-results")
async def submit_psych_results(data: PsychSubmitBody, bg: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.uid == data.user_uid).first()
    if not user:
        raise HTTPException(404, detail="Pengguna tidak ditemui.")

    # Simpan jawapan mentah
    user.psy_answers = data.answers
    user.psy_custom_text = data.psy_custom_text[:500] if data.psy_custom_text else ""

    # Backend juga kira profil (double-check frontend calculation)
    if data.answers:
        profile = generate_personality_profile(data.answers, data.psy_score, data.psy_custom_text)
        user.psy_type = profile["psy_type"]
        user.psy_desc = profile["psy_desc"]
        user.psy_traits = profile["psy_traits"]
        user.psy_dims = profile["psy_dims"]
    else:
        # Guna data dari frontend terus
        user.psy_type = data.psy_type
        user.psy_desc = data.psy_desc
        user.psy_traits = data.psy_traits
        user.psy_dims = data.psy_dims

    user.psy_score = data.psy_score
    user.psy_done = True
    db.commit()

    # ══════════════════════════════════════════
    # CRM: Tembak "Payload Emas" ke Make.com
    # Ini data paling bernilai — profil lengkap + analisis AI
    # ══════════════════════════════════════════
    crm_payload = build_profile_complete_payload({
        "full_name": user.full_name,
        "phone": user.phone,
        "age": user.age,
        "gender": user.gender,
        "status": user.status,
        "state": user.state_residence,
        "education": user.education,
        "occupation": user.occupation,
        "income_class": user.income_class,
        "psy_score": user.psy_score,
        "psy_type": user.psy_type,
        "psy_desc": user.psy_desc,
        "psy_traits": user.psy_traits,
        "psy_dims": user.psy_dims,
        "psy_custom_text": user.psy_custom_text,
        "photo_url": user.photo_url,
        "tier": user.tier,
    })
    bg.add_task(fire_to_makecom, crm_payload, settings.MAKE_WEBHOOK_URL)

    logger.info(f"[PSYCH] ✅ {user.full_name} — Skor: {data.psy_score}, Jenis: {user.psy_type}")

    return {
        "status": "Success",
        "psy_score": user.psy_score,
        "psy_type": user.psy_type,
        "psy_traits": user.psy_traits,
    }


# ═══════════════════════════════════════════
#  GET /psych/questions
#  Opsional: frontend sudah ada PSY_QS (baris 1099-1131)
#  Tapi backend boleh sediakan juga untuk konsistensi
# ═══════════════════════════════════════════
@router.get("/psych/questions")
async def get_questions():
    """
    Pulangkan senarai 30 soalan.
    Frontend sudah ada hardcoded (baris 1099-1131),
    tapi endpoint ini disediakan supaya soalan boleh
    dikemaskini dari backend tanpa update frontend.
    """
    # Soalan SAMA macam frontend PSY_QS
    questions = [
        {"id":"q1","dim":"kewangan","weight":0.05,"title":"💰 Kewangan & Tanggungjawab","q":"Anda baru terima bonus RM10,000. Tindakan pertama?","opts":["Simpan terus dalam ASB/FD","Bahagi: 50% simpan, 30% labur, 20% keluarga","Belanjakan untuk pengalaman bersama tersayang","Bayar semua hutang dahulu"],"scores":[7,9,6,8]},
        {"id":"q2","dim":"keluarga","weight":0.06,"title":"👨‍👩‍👧 Keluarga & Restu","q":"Seberapa penting restu ibu bapa dalam keputusan perkahwinan?","q_type":"slider"},
        {"id":"q3","dim":"konflik","weight":0.04,"title":"🤝 Pengurusan Konflik","q":"Apabila berlaku perbalahan dengan pasangan:","opts":["Berbincang dengan tenang","Beri ruang dahulu","Minta penengah","Tulis mesej/surat"],"scores":[9,8,7,6]},
        {"id":"q4","dim":"agama","weight":0.06,"title":"🕌 Nilai Agama","q":"Amalan agama harian pasangan adalah:","opts":["Sangat penting — soleh/solehah","Penting — solat 5 waktu","Perlu ada tetapi tidak ketat","Urusan peribadi masing-masing"],"scores":[10,8,6,4]},
        # ... (30 soalan penuh sudah ada dalam frontend)
        # Backend boleh menyimpan semua 30 soalan di sini untuk sync
    ]
    return {"questions": questions, "total": 30, "note": "Frontend sudah ada senarai penuh di PSY_QS (baris 1099-1131)"}
