from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, JSON

from app.db import Base



class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), nullable=True)
    actor_type = Column(String(20), nullable=False, default="system")
    action = Column(String(80), nullable=False)
    entity_type = Column(String(40), nullable=True)
    entity_id = Column(String(80), nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # actor_id is stored as string ref (no FK constraint — actor may be system or external)

