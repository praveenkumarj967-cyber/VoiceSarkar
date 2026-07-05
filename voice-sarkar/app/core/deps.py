from __future__ import annotations
from typing import Optional, Generator

from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import verify_token
from app.db import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    from app.models import User
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    payload = verify_token(token)
    if not payload:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise credentials_exception
    return user


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_officer(current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "officer"):
        raise HTTPException(status_code=403, detail="Officer access required")
    return current_user


def require_admin_key(x_api_key: str = Header(default="")):
    from app.core.config import settings
    if x_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_api_key
