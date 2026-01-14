# Plexus 2 - New Management API (v0)

This document outlines the proposed simplified management API for Plexus 2. It consolidates multiple fragmented endpoints into four logical groups.

## Goals
- **Consolidation**: Reduce top-level endpoints from 8+ to 4.
- **Consistency**: Unified patterns for querying and cleanup.
- **Observability**: A single stream for all system events.

---

## 1. Configuration (`/v0/config`)
Manages the system's `plexus.yaml` file.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/v0/config` | Retrieves configuration with metadata. |
| `POST` | `/v0/config` | Updates the configuration (validated against schema). |

**GET Response:**
```json
{
  "config": "string (raw YAML)",
  "lastModified": "ISO 8601 timestamp",
  "checksum": "SHA-256 hash"
}
```

**POST Request Body:**
```json
{
  "config": "string (raw YAML)",
  "validate": "boolean (default: true)",
  "reload": "boolean (default: true)"
}
```

**POST Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "previousChecksum": "string",
  "newChecksum": "string",
  "validationErrors": ["string"] (optional)
}
```

---

## 2. System State (`/v0/state`)
Real-time status, health, and runtime controls.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/v0/state` | Returns current cooldowns, debug mode, and provider performance summary. |
| `POST` | `/v0/state` | Execute commands: `set-debug`, `clear-cooldowns`, `enable-provider`, `disable-provider`. |

**GET Response:**
```json
{
  "debug": {
    "enabled": "boolean",
    "captureRequests": "boolean",
    "captureResponses": "boolean"
  },
  "cooldowns": [{
    "provider": "string",
    "reason": "string",
    "endTime": "number (timestamp)",
    "remaining": "number (seconds)"
  }],
  "providers": [{
    "name": "string",
    "enabled": "boolean",
    "healthy": "boolean",
    "cooldownRemaining": "number (optional)",
    "metrics": {
      "avgLatency": "number (ms)",
      "successRate": "number (0-1)",
      "requestsLast5Min": "number"
    }
  }],
  "uptime": "number (seconds)",
  "version": "string"
}
```

**POST Request Body:**
```json
{
  "action": "set-debug",
  "payload": {
    "enabled": "boolean"
  }
}
```
or
```json
{
  "action": "clear-cooldowns",
  "payload": {
    "provider": "string (optional, omit to clear all)"
  }
}
```
or
```json
{
  "action": "enable-provider" | "disable-provider",
  "payload": {
    "provider": "string"
  }
}
```

**POST Response:**
```json
{
  "success": "boolean",
  "message": "string",
  "state": "<GET response structure>"
}
```

---

## 3. Unified Logs (`/v0/logs`)
Historical data for auditing, troubleshooting, and usage tracking.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/v0/logs` | Query logs with filters. Type param: `usage`, `error`, `trace`. |
| `GET` | `/v0/logs/:id` | Full detail for a request (Usage + Errors + Traces). |
| `DELETE` | `/v0/logs` | Bulk cleanup (all or by type/age). |

**Query Parameters for GET /v0/logs:**
- `type`: `usage` (default), `error`, `trace` (debug logs).
- `limit` / `offset`: Pagination (default limit: 100).
- `provider` / `model` / `apiKey`: Filter by metadata.
- `success`: `true` / `false` - Filter by request success.
- `startDate` / `endDate`: ISO timestamp range.

**GET /v0/logs Response:**
```json
{
  "type": "usage" | "error" | "trace",
  "total": "number",
  "limit": "number",
  "offset": "number",
  "hasMore": "boolean",
  "entries": [/* UsageLogEntry[] | ErrorLogEntry[] | DebugTraceEntry[] */]
}
```

**GET /v0/logs/:id Response:**
```json
{
  "usage": { /* UsageLogEntry */ },
  "errors": [/* ErrorLogEntry[] (optional) */],
  "traces": [/* DebugTraceEntry[] (optional) */]
}
```

### Debug Trace Structure (DebugTraceEntry)

**Field Details:**
- `id`: Request ID
- `timestamp`: ISO 8601 timestamp when trace was captured
- `clientRequest`: Client's original request (includes apiType, body, headers)
- `providerRequest`: Request transformed to provider's format (includes apiType, body, headers)
- `providerResponse` (optional): Provider's response (status, headers, body)
- `clientResponse` (optional): Response transformed to client's format (status, body)
- `providerStreamChunks` (optional): Array of streaming chunks from provider (each has timestamp, chunk as raw string)
- `clientStreamChunks` (optional): Array of streaming chunks sent to client (each has timestamp, chunk as raw string)

**Streaming Notes:**
- For streaming requests, `providerStreamChunks` and `clientStreamChunks` contain arrays of timestamped chunks
- Each chunk is stored as a raw string (SSE format for client streams, provider-specific format for provider streams)
- Stream chunks are stored separately from the main response to support large streaming payloads
- In the debug storage, stream chunks are concatenated into `.txt` files for easier inspection

**Example DebugTraceEntry:**
```json
{
  "id": "req-123",
  "timestamp": "2026-01-13T12:34:56.789Z",
  "clientRequest": {
    "apiType": "openai",
    "body": { "model": "gpt-4", "messages": [...] },
    "headers": { "authorization": "Bearer ..." }
  },
  "providerRequest": {
    "apiType": "openai",
    "body": { "model": "gpt-4", "messages": [...] },
    "headers": { "authorization": "Bearer ..." }
  },
  "providerResponse": {
    "status": 200,
    "headers": { "content-type": "application/json" },
    "body": { "id": "...", "choices": [...] }
  },
  "clientResponse": {
    "status": 200,
    "body": { "id": "...", "choices": [...] }
  },
  "clientStreamChunks": [
    { "timestamp": "2026-01-13T12:34:56.800Z", "chunk": "data: {...}\\n\\n" },
    { "timestamp": "2026-01-13T12:34:57.100Z", "chunk": "data: {...}\\n\\n" }
  ]
}
```

**DELETE /v0/logs Request Body:**
```json
{
  "type": "usage" | "error" | "trace (optional)",
  "olderThanDays": "number (optional)",
  "all": "boolean (optional, deletes all if true)"
}
```

**DELETE /v0/logs Response:**
```json
{
  "success": "boolean",
  "deleted": {
    "usage": "number",
    "error": "number",
    "trace": "number"
  }
}
```

---

## 4. Unified Event Stream (`/v0/events`)
A single Server-Sent Events (SSE) stream for real-time monitoring.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/v0/events` | Multi-topic SSE stream. |

**Event Types:**
- `usage`: Emitted when a request completes.
- `syslog`: Internal system logs (replacing `/v0/system/logs/stream`).
- `state_change`: Emitted when cooldowns or debug modes change.
- `config_change`: Emitted when configuration is updated.
