"""
app/models/complaint.py
Complaint, StatusHistory, and Notification ORM models.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy import JSON

from app.db.base import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    complaint_ref: str = Column(
        String(30),
        unique=True,
        index=True,
        nullable=False,
    )
    citizen_id: str = Column(
        String(36),
        ForeignKey("citizens.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    call_id: str = Column(
        String(36),
        ForeignKey("calls.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_officer_id: str = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    intent: str = Column(String(50), nullable=False, index=True)
    slots: dict = Column(JSON, nullable=True, default=dict)
    target_portal: str = Column(String(50), nullable=True)
    portal_reference_id: str = Column(String(100), nullable=True)
    submission_mode: str = Column(String(20), default="voice", nullable=False)
    status: str = Column(
        String(20), default="open", nullable=False, index=True
    )  # open/in_progress/resolved/failed/escalated
    priority: str = Column(String(10), default="medium", nullable=False)  # low/medium/high
    created_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    resolved_at: datetime = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    citizen = relationship("Citizen", back_populates="complaints")
    call = relationship("Call", back_populates="complaints")
    assigned_officer = relationship(
        "User",
        back_populates="assigned_complaints",
        foreign_keys=[assigned_officer_id],
    )
    status_history = relationship(
        "StatusHistory",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="StatusHistory.changed_at",
    )
    notifications = relationship(
        "Notification",
        back_populates="complaint",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Complaint ref={self.complaint_ref!r} status={self.status!r}>"


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    complaint_id: str = Column(
        String(36),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: str = Column(String(20), nullable=False)
    changed_by: str = Column(String(100), nullable=True)  # user email or "system"
    note: str = Column(Text, nullable=True)
    changed_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    complaint = relationship("Complaint", back_populates="status_history")

    def __repr__(self) -> str:
        return (
            f"<StatusHistory complaint_id={self.complaint_id!r} "
            f"status={self.status!r}>"
        )


class Notification(Base):
    __tablename__ = "notifications"

    id: str = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    complaint_id: str = Column(
        String(36),
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel: str = Column(String(10), nullable=False)  # sms/email
    to_address: str = Column(String(255), nullable=False)
    body: str = Column(Text, nullable=False)
    provider_message_id: str = Column(String(100), nullable=True)
    delivery_status: str = Column(String(20), default="pending", nullable=False)
    sent_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    complaint = relationship("Complaint", back_populates="notifications")

    def __repr__(self) -> str:
        return (
            f"<Notification id={self.id!r} channel={self.channel!r} "
            f"status={self.delivery_status!r}>"
        )
