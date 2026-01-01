# Stage 1: Build the application
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy package-specific package.json files
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the frontend and compile the backend into a single binary
# This script runs 'bun run build:frontend' and then 'bun build ... --compile ...'
RUN bun run compile:linux

# Stage 2: Create the production image
# We use a distroless image for a small, secure, and minimal footprint
# 'cc-debian12' variant is used to ensure glibc compatibility for the compiled Bun binary
FROM gcr.io/distroless/cc-debian12

# Set the working directory to /app/backend so that relative paths like "../frontend/dist" work as expected
WORKDIR /app/backend

# Copy the compiled binary from the builder stage
COPY --from=builder /app/plexus-linux ./plexus

# Copy the frontend assets to the location expected by the backend ("../frontend/dist")
COPY --from=builder /app/packages/frontend/dist /app/frontend/dist

# Expose the port the application runs on
EXPOSE 4000

# Environment variables
ENV LOG_LEVEL=info
ENV DATA_DIR=/app/data
ENV CONFIG_FILE=/app/config/plexus.yaml

# Set volumes for configuration and data
VOLUME ["/app/config", "/app/data"]

# Run the application
CMD ["./plexus"]
