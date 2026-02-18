# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Only copy production dependencies + compiled output
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install --omit=dev --frozen-lockfile 2>/dev/null || npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Default config — override at deploy time
ENV PORT=3100
ENV EASYPANEL_URL=http://easypanel:3000
ENV EASYPANEL_EMAIL=
ENV EASYPANEL_PASSWORD=
ENV API_SECRET=
ENV NODE_ENV=production

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

CMD ["node", "dist/index.js"]
