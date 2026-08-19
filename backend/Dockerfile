# UNICAL ASSOCIATES — image backend (api / worker / scheduler)
# Multi-stage: toolchain build tidak ikut ke image akhir.

# ── Tahap 1: dependensi lengkap ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# ── Tahap 2: build ──
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
    && npm run build \
    && npm prune --omit=dev

# ── Tahap 3: runtime ──
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 10001 -S unical && adduser -u 10001 -S unical -G unical

COPY --from=build --chown=10001:10001 /app/node_modules   ./node_modules
COPY --from=build --chown=10001:10001 /app/dist           ./dist
COPY --from=build --chown=10001:10001 /app/prisma         ./prisma
COPY --from=build --chown=10001:10001 /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=10001:10001 /app/package.json   ./package.json

USER 10001:10001
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:8000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/main.js"]
