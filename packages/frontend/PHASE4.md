# Phase 4: Logs & Real-time Monitoring (Week 4)

## Overview
This phase implements the monitoring and debugging interfaces: Logs page for request tracking, Debug page for payload inspection, and Errors page for error investigation, all with real-time SSE updates.

---

## 4.1 Logs Page
**Objective**: Create detailed request logs page with real-time updates.

**Tasks**:
- Create `src/pages/Logs.tsx`:
  - Search/filter card:
    - Model filter dropdown
    - Provider filter dropdown
    - API Key filter dropdown
    - Success status filter (all/success/error)
  - Logs table with horizontal scroll:
    - Columns: Date, Key, Source IP, API, Model, Tokens, Cost, Performance, Mode, Status, Debug, Error, Delete
    - Hover effects for delete buttons
    - Status badges with icons
  - Pagination controls (prev/next with page numbers)
  - Delete individual log with confirmation
  - Delete all logs modal
  - Real-time SSE updates (when on first page)
  - Debug/Error navigation buttons
  - Cost tooltip with pricing source details
  - Copy-to-clipboard for model names
  - Use shadcn Table, Dialog, Input, Button, Badge, Label components
  - Use Lucide icons: Search, Trash2, ChevronLeft, ChevronRight, Bug, AlertTriangle, Copy
  - Fetch logs from: `/logs` with filters/pagination
  - SSE stream from: `/events` for real-time updates
  - Delete via: `/logs` (DELETE)
  - Pattern from `references/pages/Logs.tsx`

**Deliverables**: Logs page with real-time updates and full CRUD.

---

## 4.2 Debug Page
**Objective**: Create request/response payload inspection interface.

**Tasks**:
- Create `src/pages/Debug.tsx`:
  - Two-pane layout:
    - Left pane: Request list with timestamps and IDs
    - Right pane: Request details with accordion panels
  - Accordion panels for each payload type:
    - Raw Request
    - Transformed Request
    - Raw Response
    - Transformed Response
    - Snapshots (when available)
  - Monaco Editor for YAML/JSON display
  - Copy-to-clipboard buttons
  - Delete log button
  - Use shadcn Dialog, Tabs, Button, Badge components
  - Use Monaco Editor for code display
  - Use Lucide icons: Copy, Trash2, ChevronDown, ChevronUp
  - Fetch debug logs from: `/logs?type=trace`
  - Get details from: `/logs/{id}`
  - Delete via: `/logs/{id}` (DELETE)
  - Pattern from `references/pages/Debug.tsx`

**Deliverables**: Debug page with payload inspection.

---

## 4.3 Errors Page
**Objective**: Create error investigation and debugging interface.

**Tasks**:
- Create `src/pages/Errors.tsx`:
  - Two-pane layout similar to Debug page:
    - Left pane: Error list with timestamps
    - Right pane: Error details
  - Error details:
    - Error message
    - Stack trace
    - Additional details (when available)
  - Monaco Editor for stack trace display
  - Delete individual error with confirmation
  - Delete all errors modal
  - Use shadcn Dialog, Button, Badge components
  - Use Monaco Editor for code display
  - Use Lucide icons: Trash2, ChevronDown, ChevronUp
  - Fetch errors from: `/logs?type=error`
  - Delete via: `/logs` (DELETE) with error type

**Deliverables**: Errors page with full investigation tools.

---

## Summary

**Duration**: 1 week

**Key Deliverables**:
- Logs page with filtering, pagination, and real-time SSE updates
- Logs table with 13 columns including status, performance, and action buttons
- Debug page with two-pane layout and Monaco Editor for payload inspection
- 5 accordion panels for different payload types (raw/transformed request/response, snapshots)
- Errors page with error details and stack trace viewing
- Monaco Editor integration for YAML/JSON display
- Copy-to-clipboard and delete functionality across all pages
- Real-time updates via SSE stream from `/events` endpoint

**Next Steps**: Begin Phase 5 - Configuration & System Settings (Config Editor, System State, Error Handling)
