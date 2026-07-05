"""
app/models/call.py
Call and ConversationTurn ORM models.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class Call(Base):
    __tablename__ = "calls"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    citizen_id: str = Column(
        String(36),
        ForeignKey("citizens.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    telephony_call_sid: str = Column(String(64), unique=True, index=True, nullable=True)
    from_number: str = Column(String(20), nullable=False)
    language: str = Column(String(10), default="hi", nullable=False)
    provider: str = Column(String(20), default="twilio", nullable=False)  # twilio/exotel
    started_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    ended_at: datetime = Column(DateTime(timezone=True), nullable=True)
    recording_url: str = Column(String(512), nullable=True)
    outcome: str = Column(String(50), nullable=True)  # completed/dropped/failed
    duration_seconds: int = Column(Integer, nullable=True)

    # Relationships
    citizen = relationship("Citizen", back_populates="calls")
    turns = relationship(
        "ConversationTurn",
        back_populates="call",
        order_by="ConversationTurn.turn_index",
        cascade="all, delete-orphan",
    )
    complaints = relationship("Complaint", back_populates="call")

    def __repr__(self) -> str:
        return f"<Call id={self.id!r} sid={self.telephony_call_sid!r}>"


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    call_id: str = Column(
        String(36),
        ForeignKey("calls.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    turn_index: int = Column(Integer, nullable=False, default=0)
    speaker: str = Column(String(10), nullable=False)  # user / bot
    raw_asr_text: str = Column(Text, nullable=True)
    translated_text: str = Column(Text, nullable=True)
    detected_intent: str = Column(String(50), nullable=True)
    confidence: float = Column(Float, nullable=True)
    created_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    call = relationship("Call", back_populates="turns")

    def __repr__(self) -> str:
        return (
            f"<ConversationTurn call_id={self.call_id!r} "
            f"turn={self.turn_index} speaker={self.speaker!r}>"
        )
