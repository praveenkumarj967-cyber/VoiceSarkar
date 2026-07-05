"""
app/core/logging.py
Structured JSON logging configuration for VoiceSarkar.
"""

from __future__ import annotations

import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any


class JsonFormatter(logging.Formatter):
    """Format log records as JSON lines."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "extra"):
            log_obj.update(record.extra)  # type: ignore[arg-type]
        return json.dumps(log_obj, ensure_ascii=False)


def setup_logging(level: str = "INFO", use_json: bool = True) -> None:
    """
    Configure root logger.

    Args:
        level: Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL).
        use_json: If True emit JSON lines; otherwise plain text.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove any pre-existing handlers (avoid duplicate output in reload loops)
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    if use_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
    root_logger.addHandler(handler)

    # Quieten noisy third-party loggers
    for noisy in ("uvicorn.access", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Call setup_logging() once at startup."""
    return logging.getLogger(name)
