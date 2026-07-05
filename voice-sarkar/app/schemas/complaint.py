from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ComplaintOut(BaseModel):
    id: str
    complaint_ref: str
    citizen_id: str
    call_id: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    intent: str
    slots: Dict[str, Any]
    target_portal: str
    portal_reference_id: Optional[str] = None
    submission_mode: str
    status: str
    priority: str
    officer_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    officer_notes: Optional[str] = None


class StatusHistoryOut(BaseModel):
    id: str
    status: str
    changed_by: Optional[str] = None
    note: Optional[str] = None
    changed_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: str
    channel: str
    to_address: str
    body: str
    delivery_status: Optional[str] = None
    sent_at: datetime

    model_config = {"from_attributes": True}


class ComplaintDetailOut(ComplaintOut):
    status_history: List[StatusHistoryOut] = []
    notifications: List[NotificationOut] = []


class VoiceSimulateRequest(BaseModel):
    mobile: str = "+919876543210"
    language: str = "en-IN"
    utterances: List[str]


class VoiceSimulateResponse(BaseModel):
    session_id: str
    transcript: List[Dict[str, str]]
    complaint_ref: Optional[str] = None
    final_status: str


class StatsOut(BaseModel):
    total: int
    by_status: Dict[str, int]
    by_intent: Dict[str, int]
    total_calls_today: int
    open_complaints: int
    resolved_today: int


class TimeSeriesPoint(BaseModel):
    date: str
    count: int


class LanguageBreakdown(BaseModel):
    language: str
    count: int


class OfficerPerformance(BaseModel):
    officer_name: str
    total_assigned: int
    resolved: int
    avg_resolution_hours: float
