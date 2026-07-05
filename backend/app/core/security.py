"""
app/core/security.py
JWT token creation/verification and password hashing utilities.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password helpers ──────────────────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches hashed_password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return bcrypt hash of password."""
    return pwd_context.hash(password)


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT.

    Args:
        data: Payload dict. Must include a 'sub' key.
        expires_delta: Custom TTL. Defaults to settings.access_token_expire_minutes.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT token.

    Raises:
        jose.JWTError: If the token is invalid or expired.

    Returns:
        Decoded payload dict.
    """
    payload: dict[str, Any] = jwt.decode(
        token, settings.secret_key, algorithms=[settings.algorithm]
    )
    return payload


def create_refresh_token(user_id: str) -> str:
    """Create a longer-lived refresh token (7 days)."""
    return create_access_token(
        data={"sub": user_id, "type": "refresh"},
        expires_delta=timedelta(days=7),
    )
