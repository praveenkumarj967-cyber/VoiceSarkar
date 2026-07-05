# ============================================================
#  VoiceSarkar Frontend — Multi-stage Dockerfile (Next.js)
#  Stages: deps → builder → runner (standalone)
# ============================================================

# ── Stage 1: Dependency installer ────────────────────────────
FROM node:18-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat may be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for layer caching
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "No lockfile found." && exit 1; \
  fi

# ── Stage 2: Builder ──────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Build-time environment variables (non-secret)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
ARG NEXT_PUBLIC_APP_NAME=VoiceSarkar
ARG NEXT_PUBLIC_APP_VERSION=1.0.0

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js with standalone output for minimal image
# Requires: output: 'standalone' in next.config.js
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else npm run build; \
  fi

# ── Stage 3: Development image ────────────────────────────────
FROM node:18-alpine AS development

WORKDIR /app

ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Stage 4: Production runner — minimal image ────────────────
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what Next.js standalone needs
COPY --from=builder /app/public ./public

# Leverage output traces for smallest image
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:3000 || exit 1

CMD ["node", "server.js"]
