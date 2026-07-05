"""
app/db/session.py
SQLAlchemy engine and session factory.
"""

from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
connect_args: dict = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    echo=settings.debug,
    # Connection pool settings (SQLite uses StaticPool, others use QueuePool)
    pool_pre_ping=True,
)

# Enable WAL mode for SQLite to allow concurrent reads during writes
if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _connection_record) -> None:  # type: ignore[type-arg]
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session.
    Ensures the session is closed after the request.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
