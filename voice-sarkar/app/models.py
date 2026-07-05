import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Text, Integer, JSON, Index, CHAR
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator

from app.db import Base


class UUIDType(TypeDecorator):
    """Cross-database UUID type: native UUID for PostgreSQL, CHAR(36) for SQLite."""
    impl = CHAR(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(value)


def uuid_pk():
    return Column(UUIDType, primary_key=True, default=uuid.uuid4)


class Citizen(Base):
    __tablename__ = "citizens"

    id = uuid_pk()
    mobile_number = Column(String(15), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=True)
    preferred_language = Column(String(10), nullable=True)  # e.g. hi-IN
    consent_recorded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    calls = relationship("Call", back_populates="citizen")
    complaints = relationship("Complaint", back_populates="citizen")


class Call(Base):
    __tablename__ = "calls"

    id = uuid_pk()
    citizen_id = Column(UUIDType, ForeignKey("citizens.id"), nullable=True)
    telephony_call_sid = Column(String(80), unique=True, nullable=False, index=True)
    from_number = Column(String(15), nullable=False)
    language = Column(String(10), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    recording_url = Column(Text, nullable=True)
    outcome = Column(String(40), nullable=True)  # complaint_filed / status_checked / abandoned / escalated

    citizen = relationship("Citizen", back_populates="calls")
    turns = relationship("ConversationTurn", back_populates="call")


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id = uuid_pk()
    call_id = Column(UUIDType, ForeignKey("calls.id"), nullable=False)
    turn_index = Column(Integer, nullable=False)
    speaker = Column(String(10), nullable=False)  # ai / citizen
    raw_asr_text = Column(Text, nullable=True)
    translated_text = Column(Text, nullable=True)
    detected_intent = Column(String(60), nullable=True)
    confidence = Column(Integer, nullable=True)  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="turns")

    __table_args__ = (
        Index("ix_turns_call_idx", "call_id", "turn_index"),
    )


class Complaint(Base):
    __tablename__ = "complaints"

    id = uuid_pk()
    complaint_ref = Column(String(40), unique=True, nullable=False, index=True)
    citizen_id = Column(UUIDType, ForeignKey("citizens.id"), nullable=False)
    call_id = Column(UUIDType, ForeignKey("calls.id"), nullable=True)
    intent = Column(String(60), nullable=False)
    slots = Column(JSON, nullable=False, default=dict)
    target_portal = Column(String(120), nullable=False)
    portal_reference_id = Column(String(120), nullable=True)  # ID returned by the real portal, if any
    submission_mode = Column(String(10), nullable=False, default="mock")  # mock / api / rpa
    status = Column(String(20), nullable=False, default="open")  # open / in_progress / resolved / failed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    citizen = relationship("Citizen", back_populates="complaints")
    status_history = relationship("StatusHistory", back_populates="complaint")
    notifications = relationship("Notification", back_populates="complaint")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = uuid_pk()
    complaint_id = Column(UUIDType, ForeignKey("complaints.id"), nullable=False)
    status = Column(String(20), nullable=False)
    note = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="status_history")


class Notification(Base):
    __tablename__ = "notifications"

    id = uuid_pk()
    complaint_id = Column(UUIDType, ForeignKey("complaints.id"), nullable=True)
    channel = Column(String(10), nullable=False, default="sms")
    to_number = Column(String(15), nullable=False)
    body = Column(Text, nullable=False)
    provider_message_id = Column(String(80), nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivery_status = Column(String(20), nullable=True)

    complaint = relationship("Complaint", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = uuid_pk()
    actor = Column(String(80), nullable=False)  # system / admin:<id> / citizen:<mobile>
    action = Column(String(80), nullable=False)
    entity_type = Column(String(40), nullable=True)
    entity_id = Column(String(80), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

