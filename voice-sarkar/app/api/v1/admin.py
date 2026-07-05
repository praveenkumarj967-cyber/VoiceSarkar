"""Admin API — users, audit logs, system health"""
from __future__ import annotations
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter_by(email=payload.email).first():
        raise HTTPException(400, "Email already exists")
    user = User(email=payload.email, hashed_password=get_password_hash(payload.password),
                full_name=payload.full_name, role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, update: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    for field, val in update.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}")
def deactivate_user(user_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = False
    db.commit()
    return {"ok": True, "message": f"User {user.email} deactivated"}


@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0, limit: int = 100,
    actor_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db), _=Depends(require_admin),
):
    q = db.query(AuditLog)
    if actor_type:
        q = q.filter_by(actor_type=actor_type)
    if action:
        q = q.filter(AuditLog.action.contains(action))
    logs = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [{"id": l.id, "actor_type": l.actor_type, "action": l.action,
             "entity_type": l.entity_type, "entity_id": l.entity_id, "created_at": l.created_at.isoformat()}
            for l in logs]


@router.get("/system-health")
def system_health(db: Session = Depends(get_db), _=Depends(require_admin)):
    health: dict = {"status": "ok", "services": {}}
    # DB check
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        health["services"]["database"] = "ok"
    except Exception as e:
        health["services"]["database"] = f"error: {e}"
        health["status"] = "degraded"
    # Redis check
    try:
        import redis as _redis
        from app.core.config import settings
        r = _redis.from_url(settings.redis_url, socket_connect_timeout=1)
        r.ping()
        health["services"]["redis"] = "ok"
    except Exception:
        health["services"]["redis"] = "unavailable (using in-memory fallback)"
    return health
