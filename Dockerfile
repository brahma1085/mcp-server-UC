# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code and build
COPY . .
RUN npm run build

# Stage 2: Production Run
FROM node:18-alpine

WORKDIR /app

# We don't want to run the server as root for security purposes
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Set environment variables for production
ENV NODE_ENV=production

# The default transport is stdio, so we just run the start script
# Healthchecks over HTTP are not applicable to stdio based MCP servers.
CMD ["npm", "run", "start"]
