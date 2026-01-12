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
| `GET` | `/v0/config` | Retrieves the raw YAML configuration. |
| `POST` | `/v0/config` | Updates the configuration (validated against schema). |

---

## 2. System State (`/v0/state`)
Real-time status, health, and runtime controls.

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/v0/state` | Returns current cooldowns, debug mode, and provider performance summary. |
| `POST` | `/v0/state` | Execute commands: `set-debug`, `clear-cooldowns`. |

**Request Body for POST:**
```json
{
  "action": "set-debug" | "clear-cooldowns",
  "payload": { ... }
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
| `DELETE` | `/v0/logs/:id` | Remove a specific record. |

**Query Parameters for GET /v0/logs:**
- `type`: `usage` (default), `error`, `trace` (debug logs).
- `limit` / `offset`: Pagination.
- `provider` / `model` / `apiKey`: Filter by metadata.
- `startDate` / `endDate`: ISO timestamp range.

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
