# Multi-stage build for production

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src
COPY public ./public

# Build frontend
RUN npm run build

# Stage 2: Setup backend
FROM node:20-alpine AS backend-setup
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --production

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy backend files
COPY --chown=nodejs:nodejs --from=backend-setup /app/server/node_modules ./server/node_modules
COPY --chown=nodejs:nodejs server ./server

# Copy built frontend
COPY --chown=nodejs:nodejs --from=frontend-build /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]

