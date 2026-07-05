from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from app.db import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_ref = Column(String(40), unique=True, nullable=False, index=True)
    citizen_id = Column(String(36), ForeignKey("citizens.id"), nullable=False)
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=True)
    assigned_officer_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    intent = Column(String(60), nullable=False)
    slots = Column(JSON, nullable=False, default=dict)
    target_portal = Column(String(120), nullable=False)
    portal_reference_id = Column(String(120), nullable=True)
    submission_mode = Column(String(10), nullable=False, default="mock")
    status = Column(String(20), nullable=False, default="open")  # open|in_progress|resolved|failed|escalated
    priority = Column(String(10), nullable=False, default="medium")  # low|medium|high

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    officer_notes = Column(Text, nullable=True)

    citizen = relationship("Citizen", back_populates="complaints")
    call = relationship("Call", back_populates="complaints")
    assigned_officer = relationship("User", back_populates="assigned_complaints", foreign_keys=[assigned_officer_id])
    status_history = relationship("StatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="complaint", cascade="all, delete-orphan")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id"), nullable=False)
    status = Column(String(20), nullable=False)
    changed_by = Column(String(80), nullable=True)  # user id or "system"
    note = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="status_history")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String(36), ForeignKey("complaints.id"), nullable=True)
    channel = Column(String(10), nullable=False, default="sms")  # sms | email
    to_address = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    provider_message_id = Column(String(120), nullable=True)
    delivery_status = Column(String(30), nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="notifications")
