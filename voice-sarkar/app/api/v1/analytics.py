"""Analytics API — stats, timeseries, breakdowns"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_officer
from app.models import Complaint
from app.models.call import Call
from app.schemas.complaint import StatsOut, TimeSeriesPoint, LanguageBreakdown

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db), _=Depends(require_officer)):
    total = db.query(Complaint).count()
    statuses = ["open", "in_progress", "resolved", "failed", "escalated"]
    by_status = {s: db.query(Complaint).filter_by(status=s).count() for s in statuses}
    intents = ["pension", "electricity", "water", "ration", "rti", "municipal", "id_card", "health", "roads", "scholarship"]
    by_intent = {i: db.query(Complaint).filter_by(intent=i).count() for i in intents}
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    calls_today = db.query(Call).filter(Call.started_at >= today).count()
    resolved_today = db.query(Complaint).filter(Complaint.resolved_at >= today).count()
    return StatsOut(
        total=total, by_status=by_status, by_intent=by_intent,
        total_calls_today=calls_today, open_complaints=by_status.get("open", 0),
        resolved_today=resolved_today,
    )


@router.get("/timeseries", response_model=List[TimeSeriesPoint])
def get_timeseries(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), _=Depends(require_officer)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (db.query(func.date(Complaint.created_at).label("date"), func.count().label("count"))
            .filter(Complaint.created_at >= since)
            .group_by(func.date(Complaint.created_at))
            .order_by(func.date(Complaint.created_at))
            .all())
    return [TimeSeriesPoint(date=str(r.date), count=r.count) for r in rows]


@router.get("/language-breakdown", response_model=List[LanguageBreakdown])
def get_language_breakdown(db: Session = Depends(get_db), _=Depends(require_officer)):
    rows = (db.query(Call.language, func.count().label("count"))
            .group_by(Call.language).order_by(func.count().desc()).all())
    return [LanguageBreakdown(language=r.language or "unknown", count=r.count) for r in rows]


@router.get("/resolution-time")
def get_resolution_time(db: Session = Depends(get_db), _=Depends(require_officer)):
    """Average resolution time in hours by intent."""
    rows = (db.query(Complaint.intent, Complaint.created_at, Complaint.resolved_at)
            .filter(Complaint.resolved_at.isnot(None)).all())
    by_intent: dict = {}
    for r in rows:
        delta_hrs = (r.resolved_at - r.created_at).total_seconds() / 3600
        by_intent.setdefault(r.intent, []).append(delta_hrs)
    return [
        {"intent": intent, "avg_hours": round(sum(vals) / len(vals), 1), "count": len(vals)}
        for intent, vals in by_intent.items()
    ]


@router.get("/officer-performance")
def get_officer_performance(db: Session = Depends(get_db), _=Depends(require_officer)):
    from app.models.user import User
    officers = db.query(User).filter_by(role="officer").all()
    result = []
    for o in officers:
        total = db.query(Complaint).filter_by(assigned_officer_id=o.id).count()
        resolved = db.query(Complaint).filter_by(assigned_officer_id=o.id, status="resolved").count()
        result.append({"officer_id": o.id, "officer_name": o.full_name, "total_assigned": total, "resolved": resolved})
    return result
