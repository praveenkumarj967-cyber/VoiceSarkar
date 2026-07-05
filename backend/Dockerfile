# ============================================================
#  VoiceSarkar Backend — Multi-stage Dockerfile
#  Python 3.12 (stable) for production reliability
# ============================================================

# ── Stage 1: Base image with system deps ─────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Dependencies installer ──────────────────────────
FROM base AS deps

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Development image ────────────────────────────────
FROM deps AS development

# Dev-only tools
RUN pip install --no-cache-dir \
    pytest \
    pytest-cov \
    pytest-asyncio \
    httpx \
    black \
    ruff \
    mypy

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "debug"]

# ── Stage 4: Production image ─────────────────────────────────
FROM deps AS production

# Create non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

COPY --chown=appuser:appgroup . .

# Remove dev/test files from production image
RUN rm -rf tests/ .pytest_cache/ .ruff_cache/ .mypy_cache/ \
    && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

USER appuser
EXPOSE 8000

# Gunicorn with UvicornWorker for production
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--log-level", "info", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
