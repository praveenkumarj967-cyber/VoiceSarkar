"""
Voice Sarkar — FastAPI Application Entry Point
Governance by Voice, Not by Screen.
"""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.config import settings

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("voicesarkar")


# ── DB init + seed ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Voice Sarkar starting up...")
    from app.db import engine, Base
    import app.models  # noqa: F401 — ensure all models are imported
    Base.metadata.create_all(bind=engine)
    _ensure_default_admin()
    logger.info("✅ Database tables ready.")
    logger.info(f"🌐 Docs: {settings.public_base_url}/docs")
    yield
    logger.info("🛑 Voice Sarkar shutting down.")


def _ensure_default_admin():
    """Create default admin user if no users exist."""
    from app.db import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        if not db.query(User).first():
            admin = User(
                email="admin@voicesarkar.gov.in",
                hashed_password=get_password_hash("Admin@123"),
                full_name="System Administrator",
                role="admin",
            )
            officer = User(
                email="officer@voicesarkar.gov.in",
                hashed_password=get_password_hash("Officer@123"),
                full_name="Field Officer",
                role="officer",
            )
            db.add_all([admin, officer])
            db.commit()
            logger.info("✅ Default admin and officer accounts created.")
            logger.info("   Admin: admin@voicesarkar.gov.in / Admin@123")
            logger.info("   Officer: officer@voicesarkar.gov.in / Officer@123")
    finally:
        db.close()


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Voice Sarkar API",
    description=(
        "**Voice Sarkar** — Governance by Voice, Not by Screen.\n\n"
        "Enables any Indian citizen to access government services via a phone call "
        "from any mobile phone (including feature phones) without internet access.\n\n"
        "## Authentication\nUse JWT Bearer token from `POST /api/v1/auth/login/json`.\n"
        "Default admin: `admin@voicesarkar.gov.in` / `Admin@123`"
    ),
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.v1 import auth, voice, complaints, analytics, admin  # noqa: E402

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(voice.router, prefix=PREFIX)
app.include_router(complaints.router, prefix=PREFIX)
app.include_router(analytics.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)


# ── Health / Root ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    return {
        "name": "Voice Sarkar API",
        "version": settings.version,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "Voice Sarkar API", "version": settings.version}


# Backward compat — expose old /healthz used by tests
@app.get("/healthz", tags=["Health"])
def healthz():
    return {"status": "ok"}
