"""Complaints API — CRUD, status updates, public lookup"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_db, get_current_user, require_officer
from app.models import Complaint, StatusHistory
from app.schemas.complaint import ComplaintOut, ComplaintDetailOut, ComplaintUpdate

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    status: Optional[str] = Query(None),
    intent: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_officer),
):
    q = db.query(Complaint)
    if status:
        q = q.filter(Complaint.status == status)
    if intent:
        q = q.filter(Complaint.intent == intent)
    if priority:
        q = q.filter(Complaint.priority == priority)
    if assigned_to_me:
        q = q.filter(Complaint.assigned_officer_id == current_user.id)
    complaints = q.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()
    return complaints


@router.get("/public/{ref}")
def get_complaint_public(ref: str, db: Session = Depends(get_db)):
    """No-auth public status check endpoint."""
    c = db.query(Complaint).filter_by(complaint_ref=ref).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {
        "complaint_ref": c.complaint_ref,
        "intent": c.intent,
        "status": c.status,
        "target_portal": c.target_portal,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }


@router.get("/{ref}", response_model=ComplaintDetailOut)
def get_complaint(ref: str, db: Session = Depends(get_db), _=Depends(require_officer)):
    c = (db.query(Complaint)
         .options(joinedload(Complaint.status_history), joinedload(Complaint.notifications))
         .filter_by(complaint_ref=ref).first())
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return c


@router.put("/{ref}", response_model=ComplaintOut)
def update_complaint(ref: str, update: ComplaintUpdate, db: Session = Depends(get_db), current_user=Depends(require_officer)):
    c = db.query(Complaint).filter_by(complaint_ref=ref).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    old_status = c.status
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    if update.status and update.status != old_status:
        db.add(StatusHistory(complaint_id=c.id, status=update.status,
                             changed_by=current_user.id, note=update.officer_notes))
        if update.status == "resolved":
            c.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(c)
    return c


@router.post("/{ref}/escalate", response_model=ComplaintOut)
def escalate_complaint(ref: str, db: Session = Depends(get_db), current_user=Depends(require_officer)):
    c = db.query(Complaint).filter_by(complaint_ref=ref).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    c.status = "escalated"
    c.priority = "high"
    db.add(StatusHistory(complaint_id=c.id, status="escalated",
                         changed_by=current_user.id, note="Escalated by officer"))
    db.commit()
    db.refresh(c)
    return c
