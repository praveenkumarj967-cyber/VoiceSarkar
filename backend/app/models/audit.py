"""
app/models/audit.py
AuditLog ORM model – immutable append-only record of system actions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy import JSON

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    actor_id: str = Column(String(36), nullable=True, index=True)
    actor_type: str = Column(String(20), nullable=False)  # admin/officer/system
    action: str = Column(String(100), nullable=False, index=True)
    entity_type: str = Column(String(50), nullable=True, index=True)
    entity_id: str = Column(String(36), nullable=True, index=True)
    old_value: dict = Column(JSON, nullable=True)
    new_value: dict = Column(JSON, nullable=True)
    ip_address: str = Column(String(45), nullable=True)  # IPv6 max 45 chars
    created_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id!r} action={self.action!r} "
            f"actor={self.actor_id!r}>"
        )
