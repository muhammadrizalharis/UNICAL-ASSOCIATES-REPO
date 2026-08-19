# UNICAL ASSOCIATES REPO — image frontend
# Multi-stage; output standalone Next.js membuat image akhir tetap kecil.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -g 10001 -S unical && adduser -u 10001 -S unical -G unical

COPY --from=build --chown=10001:10001 /app/public               ./public
COPY --from=build --chown=10001:10001 /app/.next/standalone     ./
COPY --from=build --chown=10001:10001 /app/.next/static         ./.next/static

USER 10001:10001
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000/welcome').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
