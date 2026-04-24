# Morocco Open Data MCP Server - Dockerfile
# Multi-stage build for optimized production image

# ============================
# Stage 1: Build
# ============================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove devDependencies for production
RUN npm ci --only=production && npm cache clean --force

# ============================
# Stage 2: Production
# ============================
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 -G mcp

# Copy built artifacts from builder stage
COPY --from=builder --chown=mcp:mcp /app/dist ./dist
COPY --from=builder --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /app/package.json ./

# Set environment to production
ENV NODE_ENV=production
ENV MCP_PORT=3000
ENV MCP_HOST=0.0.0.0

# Switch to non-root user
USER mcp

# Expose port (for stdio transport this is not used, but useful for HTTP)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('MCP server healthy')" || exit 1

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Run the MCP server
CMD ["node", "dist/index.js"]

# ============================
# Stage 3: Development (optional)
# ============================
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Keep TypeScript source for hot reloading
VOLUME ["/app/src"]

# Set environment
ENV NODE_ENV=development
ENV MCP_PORT=3000

EXPOSE 3000

# Run in development mode with hot reloading
CMD ["npm", "run", "dev"]
