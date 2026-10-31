# Stage 1: Build the Go binary
FROM golang:alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto

# Install ca-certificates and tzdata
RUN apk add --no-cache ca-certificates tzdata git

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary without CGO
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o agora-backend ./cmd/server

# Stage 2: Minimal runtime image
FROM alpine:3.20

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Create data directory for SQLite persistence
RUN mkdir -p /data && chown -R 1001:1001 /data

WORKDIR /app

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /app/agora-backend /app/agora-backend

USER 1001:1001

ENV PORT=8080 \
    DATA_DIR=/data \
    ENVIRONMENT=production

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

ENTRYPOINT ["/app/agora-backend"]
