"""
app/models/citizen.py
Citizen profile – linked to a mobile number (caller ID).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Citizen(Base):
    __tablename__ = "citizens"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    mobile_number: str = Column(String(15), unique=True, index=True, nullable=False)
    full_name: str = Column(String(255), nullable=True)
    preferred_language: str = Column(String(10), default="hi", nullable=False)  # BCP-47
    # Last 4 digits of Aadhaar – stored as encrypted hex string
    aadhaar_last4: str = Column(String(255), nullable=True)
    consent_recorded_at: datetime = Column(DateTime(timezone=True), nullable=True)
    created_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    calls = relationship("Call", back_populates="citizen", lazy="dynamic")
    complaints = relationship("Complaint", back_populates="citizen", lazy="dynamic")

    def __repr__(self) -> str:
        return f"<Citizen id={self.id!r} mobile={self.mobile_number!r}>"
