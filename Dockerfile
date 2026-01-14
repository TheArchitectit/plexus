# Dockerfile for Plexus2 - Linux x64
# Build with: docker buildx build --platform linux/amd64 -t plexus2:latest --push .

FROM oven/bun:latest AS builder

WORKDIR /app

# Copy workspace configuration and source code
COPY package.json .
COPY bun.lock .
COPY packages/ packages/

# Install dependencies
RUN bun install --frozen-lockfile

# Compile for Linux x64
RUN bun run compile:linux

# Create data directory in builder stage
RUN mkdir -p /app/data

# Runtime stage - distroless
FROM oven/bun:distroless

WORKDIR /app
# Copy the compiled binary from builder
COPY --from=builder /app/dist/plexus2-linux-x64 /app/plexus2

# Copy data directory from builder
COPY --from=builder /app/data /app/data

# Volume mounts
VOLUME ["/app/config.yaml", "/app/data"]

# Expose port
EXPOSE 4000

# Run the application
ENTRYPOINT ["/app/plexus2"]
CMD []
