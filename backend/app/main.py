"""
JODOHKU — main.py (Updated)
Menambah routes_api_bridge sebagai router utama untuk frontend.html
"""
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging, os

from app.config import settings
from app.database import init_db, seed_demo_data

# Routers asal (legacy — masih aktif untuk backward compatibility)
from app.routes_auth import router as auth_router
from app.routes_matchmaking import router as match_router
from app.routes_chat import router as chat_router
from app.routes_payment import router as pay_router
from app.routes_stats import router as stats_router
from app.routes_profile import router as profile_router
from app.routes_psych import router as psych_router

# ★ Router baru — bridge untuk frontend.html
from app.routes_api_bridge import router as bridge_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
logger = logging.getLogger("jodohku")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═" * 55)
    logger.info("  JODOHKU — THE MAGNUM OPUS ENGINE v2.1")
    logger.info("  Backend + API Bridge untuk frontend.html")
    logger.info("═" * 55)
    init_db()
    seed_demo_data()
    yield
    logger.info("Pelayan ditutup.")


app = FastAPI(
    title="Jodohku API",
    description="Backend lengkap untuk Jodohku frontend.html",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS — tambah semua origin semasa development
# PRODUCTION: gantikan * dengan domain sebenar anda
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jodohku.my",
        "https://jodohku.netlify.app",
        "https://jodohku.vercel.app",
        "http://localhost:5500",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8000",
        # Production: buang baris di bawah
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ════════════════════════════════════════════════
#  ★ BRIDGE ROUTER — /api/...
#  Ini yang digunakan oleh frontend.html
#  Semua endpoint frontend.html ada di sini
# ════════════════════════════════════════════════
app.include_router(bridge_router, tags=["Frontend Bridge"])

# ════════════════════════════════════════════════
#  Legacy routers (untuk backward compatibility)
# ════════════════════════════════════════════════
app.include_router(auth_router, tags=["Auth (Legacy)"])
app.include_router(match_router, tags=["Matchmaking (Legacy)"])
app.include_router(chat_router, tags=["Chat (Legacy)"])
app.include_router(pay_router, tags=["Payment (Legacy)"])
app.include_router(stats_router, tags=["Stats (Legacy)"])
app.include_router(profile_router, tags=["Profile (Legacy)"])
app.include_router(psych_router, tags=["Psychometric (Legacy)"])

# Static files & frontend
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
if os.path.exists(static_dir):
    try:
        app.mount("/js", StaticFiles(directory=os.path.join(static_dir, "js")), name="js")
        app.mount("/css", StaticFiles(directory=os.path.join(static_dir, "css")), name="css")
    except Exception:
        pass


@app.get("/", response_class=HTMLResponse)
async def root():
    index = os.path.join(static_dir, "index.html")
    if os.path.exists(index):
        with open(index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("""
    <h1 style="font-family:sans-serif">Jodohku API v2.1 ✅</h1>
    <p><a href='/docs'>API Docs (Swagger)</a></p>
    <p><a href='/redoc'>API Docs (ReDoc)</a></p>
    """)


@app.get("/health")
async def health():
    return {"status": "ok", "app": "Jodohku", "version": "2.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
