from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship

from app.db import Base


class Call(Base):
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    citizen_id = Column(String(36), ForeignKey("citizens.id"), nullable=True)
    telephony_call_sid = Column(String(80), unique=True, nullable=False, index=True)
    from_number = Column(String(20), nullable=False)
    language = Column(String(10), nullable=True, default="en-IN")
    provider = Column(String(20), nullable=True, default="twilio")
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    recording_url = Column(Text, nullable=True)
    outcome = Column(String(40), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    citizen = relationship("Citizen", back_populates="calls")
    turns = relationship("ConversationTurn", back_populates="call", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="call")


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    turn_index = Column(Integer, nullable=False)
    speaker = Column(String(10), nullable=False)  # ai | citizen
    raw_asr_text = Column(Text, nullable=True)
    translated_text = Column(Text, nullable=True)
    detected_intent = Column(String(60), nullable=True)
    confidence = Column(Integer, nullable=True)  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="turns")
