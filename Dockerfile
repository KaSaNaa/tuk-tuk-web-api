# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production      # install only prod deps, use lockfile exactly

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine

# Non-root user for principle of least privilege
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Create data directory with correct permissions
RUN mkdir -p /app/data/db && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Use node directly (not npm start) so signals propagate correctly
CMD ["node", "src/app.js"]
