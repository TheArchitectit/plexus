# Phase 7: Observability & Logging - Implementation Summary

## Overview
Phase 7 adds comprehensive observability features to Plexus, including request logging, usage tracking, cost calculation, and performance metrics. This enables billing/chargeback capabilities and provides data for intelligent routing decisions.

## Implemented Features

### 1. Type Definitions
**Files Created:**
- `packages/backend/src/types/usage.ts` - Usage log entries, error logs, debug traces
- `packages/backend/src/types/pricing.ts` - Pricing configuration and cost calculation types
- `packages/backend/src/types/metrics.ts` - Performance metrics types
- `packages/backend/src/types/server.ts` - Shared ServerContext type

### 2. Storage Services
**Files Created:**
- `packages/backend/src/storage/usage-store.ts` - Persists usage logs to date-partitioned JSONL files
- `packages/backend/src/storage/error-store.ts` - Persists error logs separately for debugging

**Features:**
- Date-partitioned JSONL storage (e.g., `2026-01-12.jsonl`)
- Queryable with filters (date range, provider, model, API key)
- Automatic retention cleanup based on configured days
- Uses Bun's native file I/O

### 3. Cost Calculator Service
**File Created:** `packages/backend/src/services/cost-calculator.ts`

**Features:**
- Calculates per-request costs based on token usage
- Supports multiple pricing models:
  - Simple per-model pricing (most common)
  - Tiered pricing based on input token ranges
  - OpenRouter API integration (placeholder)
  - Fallback estimation for unknown models
- Per-token-type costs (input, output, cached, reasoning)
- Provider-level discount factors
- Costs measured per 1M tokens

### 4. Metrics Collector Service
**File Created:** `packages/backend/src/services/metrics-collector.ts`

**Features:**
- Aggregates metrics in rolling time windows (default: 5 minutes)
- Tracks per-provider:
  - Request count and success rate
  - Latency percentiles (p50, p95)
  - Time to first token (TTFT) for streaming
  - Throughput (tokens/second)
  - Cost per 1M tokens
- Automatic cleanup of old metrics outside window
- Used by intelligent selectors

### 5. Usage Logger Service
**File Created:** `packages/backend/src/services/usage-logger.ts`

**Features:**
- Logs every request with comprehensive metadata
- Tracks:
  - Client info (IP, API key, request type)
  - Routing decisions (alias, provider, model)
  - Token usage (input, output, cached, reasoning)
  - Cost breakdown
  - Performance metrics (duration, TTFT, throughput)
  - Success/failure status
- Separate logging for errors
- Integrates with cost calculator and metrics collector

### 6. Enhanced Selector Strategies
**File Modified:** `packages/backend/src/services/selector.ts`

**New Strategies:**
- **`cost`** - Selects cheapest provider based on historical cost data
- **`latency`** - Selects fastest provider based on recent latency metrics
- **`performance`** - Composite score: throughput / (latency × cost)
- Falls back to random selection when no metrics available (cold start)

### 7. Configuration Schema Updates
**Files Modified:**
- `packages/backend/src/types/config.ts` - Added logging and pricing schemas
- `config/plexus.yaml` - Added example pricing configuration

**New Configuration Options:**
```yaml
logging:
  usage:
    enabled: true
    storagePath: "./data/logs/usage"
    retentionDays: 30
  debug:
    enabled: false
    captureRequests: true
    captureResponses: true
    storagePath: "./data/logs/debug"
    retentionDays: 7
  errors:
    storagePath: "./data/logs/errors"
    retentionDays: 90

pricing:
  models:
    "gpt-4o":
      inputPer1M: 2.50
      outputPer1M: 10.00
      cachedPer1M: 1.25
  discounts:
    "azure-openai": 0.85
```

### 8. Integration with Dispatcher
**File Modified:** `packages/backend/src/services/dispatcher.ts`

**Changes:**
- Creates RequestContext for each request
- Tracks routing decisions and API transformations
- Extracts usage from responses
- Logs successful and failed requests
- Records metrics for all requests
- **Note:** Streaming usage logging deferred to future iteration

### 9. Server Integration
**Files Modified:**
- `packages/backend/src/server.ts` - Initialize observability services
- `packages/backend/src/index.ts` - Handle async createServer
- `packages/backend/src/routes/chat-completions.ts` - Pass ServerContext
- `packages/backend/src/routes/messages.ts` - Pass ServerContext
- `packages/backend/src/services/router.ts` - Pass dependencies to selector

**Architecture:**
- All observability services initialized at server startup
- Services passed via ServerContext to route handlers
- Optional services (can be disabled via config)
- Graceful degradation when services unavailable

## Test Coverage

### Tests Created:
1. `packages/backend/src/services/cost-calculator.test.ts` - 10 tests
   - Simple pricing calculations
   - Cached and reasoning tokens
   - Provider discounts
   - Tiered pricing
   - Fallback estimation

2. `packages/backend/src/services/usage-logger.test.ts` - 7 tests
   - Successful request logging
   - Streaming request metrics
   - Error logging
   - Failed request metrics
   - Disabled logger behavior

3. `packages/backend/src/services/selector.test.ts` - 13 tests
   - Random selection (uniform and weighted)
   - In-order selection with fallback
   - Cost-based selection
   - Latency-based selection
   - Performance-based selection
   - Cold start fallbacks

**All tests passing: 30/30**

## Usage Example

```typescript
// Configuration enables usage logging
const config = loadConfig(); // Includes pricing config

// Server creates observability services
const { server } = await createServer(config);

// Each request automatically logged
POST /v1/chat/completions
{
  "model": "fast",
  "messages": [...]
}

// Creates usage log entry:
{
  "id": "req-123",
  "timestamp": "2026-01-12T07:30:00Z",
  "aliasUsed": "fast",
  "actualProvider": "openai",
  "actualModel": "gpt-4o-mini",
  "usage": {
    "inputTokens": 100,
    "outputTokens": 50,
    "totalTokens": 150
  },
  "cost": {
    "totalCost": 0.000375,
    "currency": "USD",
    "source": "config"
  },
  "metrics": {
    "durationMs": 523,
    "ttftMs": null
  }
}

// Metrics enable intelligent routing
models:
  - alias: "cost-optimized"
    targets:
      - provider: "openai"
        model: "gpt-4o-mini"
      - provider: "anthropic"
        model: "claude-haiku"
    selector: "cost"  # Automatically selects cheapest
```

## Key Design Decisions

### 1. JSONL Storage Format
**Choice:** Date-partitioned JSONL files
**Rationale:**
- Append-only writes are fast
- Easy to process with standard tools (grep, jq)
- No database setup required
- Can migrate to SQLite later if needed

### 2. Bun File I/O
**Choice:** Use Bun's native file operations instead of Node's fs
**Rationale:**
- Follows project guidelines
- Better performance with Bun runtime
- Simpler async/await patterns

### 3. Rolling Time Windows
**Choice:** 5-minute rolling windows for metrics
**Rationale:**
- Adapts quickly to provider changes
- Recent data most relevant for routing
- Simpler than exponential moving averages

### 4. Cost Measurement Per 1M Tokens
**Choice:** Track costs per million tokens (not per 1K)
**Rationale:**
- Standard industry practice
- Matches provider pricing models
- Easier to compare across providers

### 5. Streaming Logging Deferred
**Choice:** Skip usage logging for streaming requests initially
**Rationale:**
- Requires stream interception to extract usage
- Adds complexity to response handling
- Can be enhanced in future iteration
- Non-streaming logging provides immediate value

## Future Enhancements

1. **Streaming Usage Extraction**
   - Intercept streaming responses to extract usage
   - Track real-time throughput metrics

2. **Debug Mode Implementation**
   - Capture full request/response payloads
   - Link debug traces to usage logs

3. **SQLite Backend**
   - Optional SQLite storage for complex queries
   - Better aggregation performance

4. **OpenRouter Integration**
   - Implement actual OpenRouter API calls
   - Cache dynamic pricing data

5. **Usage Dashboard**
   - Web UI for viewing usage logs
   - Cost breakdowns by provider/model/API key

6. **Retention Cleanup Automation**
   - Scheduled cleanup of old log files
   - Automatic archival to cold storage

## Dependencies

- **Phase 1:** Configuration and logging infrastructure
- **Phase 2:** Dispatcher and request lifecycle
- **Phase 3:** Router and selector interface
- **Phase 6:** Health monitoring (for cooldown integration)

## Files Modified Summary

**New Files (14):**
- 4 type definition files
- 2 storage service files
- 3 core service files
- 3 test files
- 1 shared server type
- 1 summary document

**Modified Files (7):**
- Configuration types and loader
- Dispatcher (usage logging)
- Router (pass dependencies)
- Selector (new strategies)
- Server (initialize services)
- 2 route handlers (ServerContext)
- Main config file

## Conclusion

Phase 7 successfully implements comprehensive observability for Plexus, enabling:
- ✅ Detailed request logging for audit/billing
- ✅ Cost calculation per request
- ✅ Performance metrics collection
- ✅ Intelligent cost/latency-based routing
- ✅ Foundation for management API (Phase 8)

All success criteria from PHASE7.md have been met, with the exception of streaming usage extraction which is deferred to a future iteration.
