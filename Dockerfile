# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# ── Stage 2: production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Datos para el script de migración (opcional en producción)
COPY data/catalogo.xlsx ./data/catalogo.xlsx

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.js"]
