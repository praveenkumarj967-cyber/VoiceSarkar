"""
app/db/base.py
Declarative base for SQLAlchemy models.
Import ALL models here so Alembic autogenerate finds them.
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for every ORM model."""
    pass


# ── Import all models so metadata is populated for Alembic ──────────────────
# (These imports must come AFTER Base is defined)
from app.models.user import User          # noqa: E402, F401
from app.models.citizen import Citizen     # noqa: E402, F401
from app.models.call import Call, ConversationTurn  # noqa: E402, F401
from app.models.complaint import (         # noqa: E402, F401
    Complaint,
    StatusHistory,
    Notification,
)
from app.models.audit import AuditLog      # noqa: E402, F401
