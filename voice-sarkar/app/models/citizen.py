from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship

from app.db import Base


class Citizen(Base):
    __tablename__ = "citizens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mobile_number = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=True)
    preferred_language = Column(String(10), nullable=True, default="en-IN")
    aadhaar_last4 = Column(String(10), nullable=True)
    address = Column(Text, nullable=True)
    consent_recorded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calls = relationship("Call", back_populates="citizen")
    complaints = relationship("Complaint", back_populates="citizen")
