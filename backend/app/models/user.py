"""
app/models/user.py
User ORM model – supports admin, officer, and citizen roles.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: str = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password: str = Column(String(255), nullable=False)
    full_name: str = Column(String(255), nullable=False)
    role: str = Column(String(20), nullable=False, default="citizen")  # admin/officer/citizen
    is_active: bool = Column(Boolean, default=True, nullable=False)
    created_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Reverse FK: complaints assigned to this officer
    assigned_complaints = relationship(
        "Complaint",
        back_populates="assigned_officer",
        foreign_keys="Complaint.assigned_officer_id",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r} role={self.role!r}>"
