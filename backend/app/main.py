"""
JODOHKU — main.py  v2.1
Backend lengkap + Mualaf/Asnaf/Admin verification routes.
"""
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging, os

from app.config import settings
from app.database import init_db, seed_demo_data
from app.routes_auth import router as auth_router
from app.routes_matchmaking import router as match_router
from app.routes_chat import router as chat_router
from app.routes_payment import router as pay_router
from app.routes_stats import router as stats_router
from app.routes_profile import router as profile_router
from app.routes_psych import router as psych_router
from app.routes_verification import router as verify_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s — %(message)s")
logger = logging.getLogger("jodohku")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("═" * 55)
    logger.info("  JODOHKU — THE MAGNUM OPUS ENGINE v2.1")
    logger.info("═" * 55)
    init_db()
    seed_demo_data()
    yield
    logger.info("Pelayan ditutup.")


app = FastAPI(
    title="Jodohku API",
    description="Backend untuk Jodohku v4",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jodohku.my",
        "https://pi.jodohku.my",
        "https://www.jodohku.my",
        "https://jodohku.vercel.app",
        "https://jodohku.netlify.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,    tags=["Auth"])
app.include_router(match_router,   tags=["Matchmaking"])
app.include_router(chat_router,    tags=["Chat"])
app.include_router(pay_router,     tags=["Payment"])
app.include_router(stats_router,   tags=["Stats"])
app.include_router(profile_router, tags=["Profile"])
app.include_router(psych_router,   tags=["Psychometric"])
app.include_router(verify_router,  tags=["Verification"])

static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
if os.path.exists(static_dir):
    if os.path.exists(os.path.join(static_dir, "js")):
        app.mount("/js", StaticFiles(directory=os.path.join(static_dir, "js")), name="js")
    if os.path.exists(os.path.join(static_dir, "css")):
        app.mount("/css", StaticFiles(directory=os.path.join(static_dir, "css")), name="css")

@app.get("/", response_class=HTMLResponse)
async def root():
    index = os.path.join(static_dir, "index.html")
    if os.path.exists(index):
        with open(index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Jodohku API v2.1 aktif</h1><p><a href='/docs'>API Docs</a></p>")

@app.get("/health")
async def health():
    return {"status": "ok", "app": "Jodohku", "version": "2.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
