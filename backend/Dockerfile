# ─── Build stage ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production stage ────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p uploads && chown appuser:appgroup uploads
USER appuser

EXPOSE 4000

# dumb-init handles PID 1 signal forwarding correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
