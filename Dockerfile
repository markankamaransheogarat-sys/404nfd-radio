# ==============================================================================
# 404nfd Radio Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Build Frontend SPA
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend TypeScript
FROM node:22-alpine AS backend-builder
# better-sqlite3 requires python and build-base to build native bindings if needed
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 3: Runtime Image
FROM node:22-alpine AS runner
RUN apk add --no-cache python3 make g++ curl
WORKDIR /app

# Copy built frontend SPA (served by backend static middleware)
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Install production dependencies for backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled backend dist
COPY --from=backend-builder /app/backend/dist ./dist

# Copy audio tracks library
COPY backend/media ./media

ENV PORT=8004
ENV NODE_ENV=production
EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8004/health || exit 1

CMD ["node", "dist/index.js"]
