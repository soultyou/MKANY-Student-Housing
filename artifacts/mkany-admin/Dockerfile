# Stage 1: Build stage using node/bun
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy root configurations and workspace definitions
COPY package.json bun.lock tsconfig.json tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/mkany-admin/ ./artifacts/mkany-admin/

# Install dependencies and build the static assets
RUN bun install --frozen-lockfile
RUN cd artifacts/mkany-admin && bun run build

# Stage 2: Minimal production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy built assets from builder stage
COPY --from=builder /app/artifacts/mkany-admin/dist ./dist
# Copy the custom production server script
COPY --from=builder /app/artifacts/mkany-admin/server.js ./server.js

# Expose port (Cloud Run sets PORT env, but expose is good practice)
EXPOSE 3000

# Run the lightweight Node.js static server
CMD ["node", "server.js"]
