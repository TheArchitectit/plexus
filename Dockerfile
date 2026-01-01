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
RUN bun run compile:linux-amd64 && bun run compile:linux-arm64

# Stage 2: Create the production image
# We use debian:bookworm-slim to provide a shell for the entrypoint script
FROM debian:bookworm-slim

# Set the working directory to /app/backend so that relative paths like "../frontend/dist" work as expected
WORKDIR /app/backend

# Copy the compiled binaries from the builder stage
COPY --from=builder /app/plexus-linux-amd64 ./plexus-linux-amd64
COPY --from=builder /app/plexus-linux-arm64 ./plexus-linux-arm64
COPY entrypoint.sh ./entrypoint.sh

# Ensure entrypoint is executable
RUN chmod +x ./entrypoint.sh

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

# Run the application via the entrypoint script
CMD ["./entrypoint.sh"]
