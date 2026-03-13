"""
JODOHKU — ai_engine.py
Enjin padanan AI + analisis keperibadian.
Logik ini sepadan dengan psyCalcResult() dalam frontend (baris 1207-1269).
"""
import random
from typing import Dict, List


def calculate_compatibility(user_dims: Dict, candidate_dims: Dict) -> float:
    """
    Kira skor keserasian antara dua pengguna.
    Menggunakan perbezaan dimensi berwajaran.
    
    Frontend (baris 806-807) hanya paparkan 80%+ padanan.
    Frontend (baris 828) highlight 90%+ sebagai PADANAN TERBAIK.
    """
    if not user_dims or not candidate_dims:
        return round(random.uniform(78, 96), 1)

    # Berat dimensi — agama dan keluarga paling penting
    weights = {
        "agama": 1.5, "keluarga": 1.3, "kewangan": 1.2, "emosi": 1.2,
        "komunikasi": 1.1, "komitmen": 1.1, "gaya_hidup": 1.0,
        "rumah_tangga": 0.9, "pemikiran": 0.9, "makanan": 0.8,
        "hobi": 0.7, "sosial": 0.8, "aktiviti": 0.7, "kebersihan": 0.8,
        "masa_depan": 0.9, "teknologi": 0.5, "personaliti": 0.8,
        "konflik": 1.0, "anak": 1.0, "kerjaya": 0.9,
    }

    all_dims = set(list(user_dims.keys()) + list(candidate_dims.keys()))
    total_score = 0
    total_weight = 0

    for dim in all_dims:
        u = user_dims.get(dim, 5)
        c = candidate_dims.get(dim, 5)
        w = weights.get(dim, 1.0)
        similarity = (1 - abs(u - c) / 10) * 100
        total_score += similarity * w
        total_weight += w

    raw = total_score / total_weight if total_weight > 0 else 80
    return round(min(99, max(65, raw + random.uniform(-2, 4))), 1)


def generate_ai_verdict(user_dims: Dict, candidate_dims: Dict, candidate_name: str, score: float) -> str:
    """
    Jana analisis AI untuk card calon.
    Frontend paparkan ini dalam ai-box (baris 853-855).
    """
    strengths = []
    if candidate_dims.get("agama", 0) >= 8 and user_dims.get("agama", 0) >= 8:
        strengths.append("Nilai spiritual dan agama sangat serasi")
    if candidate_dims.get("keluarga", 0) >= 8:
        strengths.append("Sangat mengutamakan kekeluargaan")
    if candidate_dims.get("kewangan", 0) >= 8:
        strengths.append("Kestabilan kewangan yang baik")
    if candidate_dims.get("komunikasi", 0) >= 8:
        strengths.append("Gaya komunikasi yang matang")
    if candidate_dims.get("emosi", 0) >= 8:
        strengths.append("Kematangan emosi yang tinggi")
    if candidate_dims.get("gaya_hidup", 0) >= 7 and user_dims.get("gaya_hidup", 0) >= 7:
        strengths.append("Gaya hidup yang selaras")

    if score >= 90:
        prefix = "Padanan terbaik!"
    elif score >= 85:
        prefix = "Sangat disyorkan."
    else:
        prefix = "Potensi yang baik."

    detail = " ".join(strengths[:3]) + "." if strengths else "Banyak persamaan dalam nilai dan gaya hidup."
    return f"{prefix} {detail}"


def generate_personality_profile(answers: Dict, score: float, custom_text: str = "") -> Dict:
    """
    Jana profil personaliti dari jawapan ujian.
    SEPADAN dengan psyCalcResult() frontend (baris 1207-1269).
    
    Frontend threshold (baris 1224-1236):
      >= 8.5 → Pemimpin Keluarga Berwibawa
      >= 7.0 → Pasangan Seimbang & Matang
      >= 5.5 → Penjelajah Hubungan
      < 5.5  → Individu Berkembang
    """
    # Aggregate by dimension — sama macam frontend baris 1214-1217
    dims = {}
    for qid, ans_data in answers.items():
        if isinstance(ans_data, dict) and "score" in ans_data:
            # Cari dimensi dari ID soalan
            dim = _get_dim_from_id(qid)
            if dim:
                if dim not in dims:
                    dims[dim] = []
                dims[dim].append(ans_data["score"])

    avg_dims = {}
    for k, arr in dims.items():
        if arr:
            avg_dims[k] = round(sum(arr) / len(arr), 1)

    # Personality type — sama threshold macam frontend baris 1224-1236
    custom_suffix = f" Tambahan dari pengguna: {custom_text}." if custom_text else ""

    if score >= 8.5:
        ptype = "Pemimpin Keluarga Berwibawa"
        pdesc = (
            "Anda mempunyai nilai kekeluargaan yang sangat kuat, komited, dan stabil "
            "dari segi kewangan dan emosi. Anda seorang yang bertanggungjawab, mempunyai "
            "visi masa depan yang jelas, dan sangat mengutamakan agama serta restu keluarga. "
            "Gaya komunikasi anda matang dan anda mampu menguruskan konflik dengan bijak. "
            "Anda adalah calon yang sangat ideal untuk perkahwinan jangka panjang."
            + custom_suffix
        )
    elif score >= 7.0:
        ptype = "Pasangan Seimbang & Matang"
        pdesc = (
            "Anda mempunyai keseimbangan yang baik antara kerjaya, keluarga, dan nilai peribadi. "
            "Anda fleksibel tetapi berprinsip, mampu berkomunikasi dengan baik, dan menghargai "
            "masa berkualiti bersama pasangan. Anda seorang yang terbuka tetapi masih menjaga "
            "batasan agama dan budaya. Potensi untuk membina keluarga harmoni sangat tinggi."
            + custom_suffix
        )
    elif score >= 5.5:
        ptype = "Penjelajah Hubungan"
        pdesc = (
            "Anda masih dalam proses memahami keutamaan anda dalam perhubungan. "
            "Keterbukaan anda terhadap pengalaman baru adalah kekuatan, tetapi anda mungkin "
            "perlu lebih jelas tentang nilai-nilai asas yang anda cari dalam pasangan."
            + custom_suffix
        )
    else:
        ptype = "Individu Berkembang"
        pdesc = (
            "Anda mempunyai potensi besar dalam membina perhubungan. Pengalaman dan "
            "pembelajaran berterusan akan membantu anda memahami apa yang benar-benar "
            "anda mahukan dalam pasangan hidup."
            + custom_suffix
        )

    # Generate traits — sama logik macam frontend baris 1238-1252
    traits = []
    if avg_dims.get("agama", 0) >= 8: traits.append("Spiritual")
    if avg_dims.get("keluarga", 0) >= 8: traits.append("Mengutamakan Keluarga")
    if avg_dims.get("kewangan", 0) >= 8: traits.append("Bijak Kewangan")
    if avg_dims.get("komunikasi", 0) >= 8: traits.append("Komunikatif")
    if avg_dims.get("kebersihan", 0) >= 8: traits.append("Kemas & Teratur")
    if avg_dims.get("hobi", 0) >= 8: traits.append("Suka Membaca")
    if avg_dims.get("makanan", 0) >= 8: traits.append("Pemakanan Sihat")
    if avg_dims.get("aktiviti", 0) >= 8: traits.append("Aktif & Bertenaga")
    if avg_dims.get("emosi", 0) >= 8: traits.append("Matang Emosi")
    if avg_dims.get("sosial", 0) >= 8: traits.append("Pandai Bergaul")
    if avg_dims.get("komitmen", 0) >= 8: traits.append("Komited")
    if avg_dims.get("pemikiran", 0) >= 8: traits.append("Analitikal")
    if len(traits) < 3:
        traits.extend(["Potensi Tinggi", "Terbuka"])

    return {
        "psy_type": ptype,
        "psy_desc": pdesc,
        "psy_traits": traits[:8],
        "psy_dims": avg_dims,
    }


# Mapping question ID prefix to dimension
_DIM_MAP = {
    "q1": "kewangan", "q2": "keluarga", "q3": "konflik", "q4": "agama",
    "q5": "kerjaya", "q6": "anak", "q7": "komunikasi", "q8": "rumah_tangga",
    "q9": "gaya_hidup", "q10": "komitmen", "q11": "pemikiran", "q12": "pemikiran",
    "q13": "makanan", "q14": "makanan", "q15": "makanan", "q16": "aktiviti",
    "q17": "aktiviti", "q18": "kebersihan", "q19": "kebersihan", "q20": "hobi",
    "q21": "hobi", "q22": "hobi", "q23": "sosial", "q24": "sosial",
    "q25": "emosi", "q26": "emosi", "q27": "masa_depan", "q28": "masa_depan",
    "q29": "teknologi", "q30": "personaliti",
}

def _get_dim_from_id(qid: str) -> str:
    return _DIM_MAP.get(qid, "")
