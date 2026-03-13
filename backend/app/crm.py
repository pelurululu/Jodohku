"""
╔══════════════════════════════════════════════════════════════════════╗
║  JODOHKU — MODUL CRM (crm.py)                                       ║
║                                                                      ║
║  ARAHAN UNTUK DEVELOPER:                                             ║
║  Modul ini adalah "Jambatan Saraf" antara backend dan CRM.           ║
║  Belum disambungkan. Ikut 4 fasa di bawah untuk mengaktifkan.        ║
║                                                                      ║
║  ═══════════════════════════════════════════════════════════════      ║
║  FASA 1: SEDIAKAN AIRTABLE                                          ║
║  ═══════════════════════════════════════════════════════════════      ║
║  1. Buka Airtable.com → Cipta Base "Jodohku Command Center"         ║
║  2. Cipta lajur TEPAT seperti ini:                                   ║
║     - Nama Penuh (Single line text)                                  ║
║     - No WhatsApp (Phone number)                                     ║
║     - Umur (Number)                                                  ║
║     - Jantina (Single select: Lelaki, Perempuan)                     ║
║     - Status Perkahwinan (Single select: Bujang,Janda,Duda)          ║
║     - Negeri (Single select)                                         ║
║     - Pendidikan (Single select)                                     ║
║     - Pekerjaan (Single select)                                      ║
║     - Kelas Sosioekonomi (Single select: B40,M40,T20,VVIP)          ║
║     - Markah AI (Percent)                                            ║
║     - Analisis AI (Long text)                                        ║
║     - Jenis Personaliti (Single line text)                           ║
║     - Trait Personaliti (Long text)                                  ║
║     - Skor Dimensi (Long text / JSON)                                ║
║     - Keperibadian Tambahan (Long text)                              ║
║     - Gambar Profil (URL atau Attachment)                             ║
║     - Tier Semasa (Single select)                                    ║
║     - Tarikh Daftar (Date)                                           ║
║                                                                      ║
║  ═══════════════════════════════════════════════════════════════      ║
║  FASA 2: SETUP CLOUD STORAGE (GAMBAR)                                ║
║  ═══════════════════════════════════════════════════════════════      ║
║  Frontend hantar gambar sebagai base64 (S.photo).                    ║
║  Backend WAJIB:                                                      ║
║    1. Terima base64 dari frontend                                    ║
║    2. Upload ke AWS S3 / Supabase / GCS                              ║
║    3. Jana Public URL                                                ║
║    4. Simpan URL dalam User.photo_url                                ║
║    5. Hantar URL ke Airtable (bukan base64)                          ║
║                                                                      ║
║  ═══════════════════════════════════════════════════════════════      ║
║  FASA 3: SETUP MAKE.COM WEBHOOK                                     ║
║  ═══════════════════════════════════════════════════════════════      ║
║  1. Buka Make.com → Cipta Senario baru                               ║
║  2. Modul 1: Custom Webhook → salin URL webhook                     ║
║  3. Modul 2: Airtable → Create a Record                             ║
║     - Petakan setiap field dari webhook ke lajur Airtable            ║
║  4. Modul 3: WhatsApp Business Cloud → Send Template Message        ║
║     - Template: "Tahniah [Nama], pendaftaran VVIP anda sedang       ║
║       dianalisis oleh sistem AI kami."                               ║
║  5. Simpan URL webhook dalam .env: MAKE_WEBHOOK_URL=...             ║
║                                                                      ║
║  ═══════════════════════════════════════════════════════════════      ║
║  FASA 4: AKTIFKAN FUNGSI DI BAWAH                                   ║
║  ═══════════════════════════════════════════════════════════════      ║
║  Uncomment baris yang bertanda # [PRODUCTION] di bawah.              ║
║  Pastikan .env sudah diisi dengan kunci API yang betul.              ║
╚══════════════════════════════════════════════════════════════════════╝
"""
import logging
from typing import Dict, Optional

logger = logging.getLogger("jodohku.crm")

# ═══════════════════════════════════════════
#  PAYLOAD BUILDER
#  Struktur JSON ini dihantar ke Make.com.
#  Make.com akan auto-isi Airtable + hantar WhatsApp.
# ═══════════════════════════════════════════

def build_registration_payload(user_data: Dict) -> Dict:
    """
    Bina JSON payload untuk CRM selepas pendaftaran.
    Struktur ini WAJIB sepadan dengan lajur Airtable di Fasa 1.
    """
    return {
        "nama_penuh": user_data.get("full_name", ""),
        "no_whatsapp": user_data.get("phone", ""),
        "umur": user_data.get("age", 0),
        "jantina": user_data.get("gender", ""),
        "status_perkahwinan": user_data.get("status", ""),
        "negeri": user_data.get("state", ""),
        "emel": user_data.get("email", ""),
        "tier_semasa": user_data.get("tier", "Silver (7-Hari)"),
        "tarikh_daftar": user_data.get("created_at", ""),
    }


def build_profile_complete_payload(user_data: Dict) -> Dict:
    """
    Bina JSON payload LENGKAP selepas ujian 30 soalan siap.
    Ini adalah "Payload Emas" — data paling bernilai untuk CEO.
    """
    return {
        "nama_penuh": user_data.get("full_name", ""),
        "no_whatsapp": user_data.get("phone", ""),
        "umur": user_data.get("age", 0),
        "jantina": user_data.get("gender", ""),
        "status_perkahwinan": user_data.get("status", ""),
        "negeri": user_data.get("state", ""),
        "pendidikan": user_data.get("education", ""),
        "pekerjaan": user_data.get("occupation", ""),
        "kelas_sosioekonomi": user_data.get("income_class", ""),
        "markah_ai": user_data.get("psy_score", 0),
        "jenis_personaliti": user_data.get("psy_type", ""),
        "analisis_ai": user_data.get("psy_desc", ""),
        "trait_personaliti": ", ".join(user_data.get("psy_traits", [])),
        "skor_dimensi": str(user_data.get("psy_dims", {})),
        "keperibadian_tambahan": user_data.get("psy_custom_text", ""),
        "url_gambar_profil": user_data.get("photo_url", ""),
        "tier_semasa": user_data.get("tier", ""),
    }


def build_upgrade_payload(user_data: Dict) -> Dict:
    """Bina payload selepas naik taraf tier."""
    return {
        "nama_penuh": user_data.get("full_name", ""),
        "no_whatsapp": user_data.get("phone", ""),
        "tier_baru": user_data.get("tier", ""),
        "jumlah_bayaran": user_data.get("amount", 0),
        "tarikh_naik_taraf": user_data.get("upgraded_at", ""),
    }


# ═══════════════════════════════════════════
#  TEMBAK PAYLOAD KE MAKE.COM
# ═══════════════════════════════════════════

async def fire_to_makecom(payload: Dict, webhook_url: str = "") -> bool:
    """
    Tembak JSON ke Make.com webhook.
    
    [PRODUCTION] Uncomment blok di bawah dan pastikan
    MAKE_WEBHOOK_URL ada dalam .env
    """
    if not webhook_url:
        logger.info(f"[CRM] 📋 Payload siap (Make.com belum disambung): {list(payload.keys())}")
        logger.info(f"[CRM] Data: nama={payload.get('nama_penuh')}, phone={payload.get('no_whatsapp')}")
        return False

    # ──────────────────────────────────────────
    # [PRODUCTION] Uncomment baris di bawah:
    # ──────────────────────────────────────────
    # import httpx
    # try:
    #     async with httpx.AsyncClient(timeout=10.0) as client:
    #         resp = await client.post(webhook_url, json=payload)
    #         if resp.status_code == 200:
    #             logger.info(f"[CRM] ✅ Payload dihantar ke Make.com: {payload.get('nama_penuh')}")
    #             return True
    #         else:
    #             logger.error(f"[CRM] ❌ Make.com response: {resp.status_code}")
    #             return False
    # except Exception as e:
    #     logger.error(f"[CRM] ❌ Ralat: {e}")
    #     return False

    return False


# ═══════════════════════════════════════════
#  HANTAR WHATSAPP (META BUSINESS API)
# ═══════════════════════════════════════════

async def send_whatsapp_otp(phone: str, otp_code: str, wa_token: str = "", phone_id: str = "") -> bool:
    """
    Hantar OTP melalui WhatsApp Business API.
    
    [PRODUCTION] Isi WHATSAPP_TOKEN dan WHATSAPP_PHONE_ID dalam .env
    """
    if not wa_token or not phone_id:
        logger.info(f"[WA] 📱 OTP untuk {phone}: {otp_code} (WhatsApp API belum disambung)")
        return False

    # ──────────────────────────────────────────
    # [PRODUCTION] Uncomment baris di bawah:
    # ──────────────────────────────────────────
    # import httpx
    # wa_phone = phone.lstrip("0")
    # if not wa_phone.startswith("60"):
    #     wa_phone = "60" + wa_phone
    # url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    # headers = {"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"}
    # body = {
    #     "messaging_product": "whatsapp",
    #     "to": wa_phone,
    #     "type": "template",
    #     "template": {
    #         "name": "otp_verification",
    #         "language": {"code": "ms"},
    #         "components": [{"type": "body", "parameters": [{"type": "text", "text": otp_code}]}]
    #     }
    # }
    # try:
    #     async with httpx.AsyncClient(timeout=10.0) as client:
    #         resp = await client.post(url, headers=headers, json=body)
    #         return resp.status_code == 200
    # except Exception as e:
    #     logger.error(f"[WA] ❌ {e}")
    #     return False

    return False


async def send_whatsapp_welcome(phone: str, name: str, wa_token: str = "", phone_id: str = "") -> bool:
    """
    Hantar mesej alu-aluan selepas daftar.
    
    [PRODUCTION] Uncomment dan isi API credentials.
    """
    logger.info(f"[WA] 🎉 Welcome msg untuk {name} ({phone}) — belum disambung")
    return False


# ═══════════════════════════════════════════
#  PUSH TERUS KE AIRTABLE (BACKUP)
# ═══════════════════════════════════════════

async def push_to_airtable_direct(record: Dict, api_key: str = "", base_id: str = "", table: str = "") -> bool:
    """
    Push rekod terus ke Airtable (backup jika Make.com tidak aktif).
    
    [PRODUCTION] Isi AIRTABLE_API_KEY dan AIRTABLE_BASE_ID dalam .env
    """
    if not api_key or not base_id:
        logger.info(f"[Airtable] 📋 Rekod siap (belum disambung): {record.get('nama_penuh')}")
        return False

    # ──────────────────────────────────────────
    # [PRODUCTION] Uncomment baris di bawah:
    # ──────────────────────────────────────────
    # import httpx
    # url = f"https://api.airtable.com/v0/{base_id}/{table}"
    # headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    # body = {"records": [{"fields": {
    #     "Nama Penuh": record.get("nama_penuh", ""),
    #     "No WhatsApp": record.get("no_whatsapp", ""),
    #     "Umur": record.get("umur", 0),
    #     "Jantina": record.get("jantina", ""),
    #     "Status Perkahwinan": record.get("status_perkahwinan", ""),
    #     "Markah AI": record.get("markah_ai", 0) / 10.0,
    #     "Analisis AI": record.get("analisis_ai", ""),
    #     "Tier Semasa": record.get("tier_semasa", ""),
    # }}]}
    # try:
    #     async with httpx.AsyncClient(timeout=10.0) as client:
    #         resp = await client.post(url, headers=headers, json=body)
    #         return resp.status_code in (200, 201)
    # except Exception as e:
    #     logger.error(f"[Airtable] ❌ {e}")
    #     return False

    return False
