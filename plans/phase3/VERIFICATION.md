# Phase 3 Verification

This document contains verification steps for Phase 3: Configuration & Model Aliasing.

## Prerequisites

1. Set environment variables:
```bash
export SYNTHETIC_API_KEY="your-synthetic-api-key"
```

2. Start the server:
```bash
bun run dev
```

## Test 1: List Available Models

```bash
curl http://localhost:4000/v1/models \
  -H "Authorization: Bearer apikey"
```

**Expected Result:**
- Status: 200
- Response contains:
  - `fast` model (canonical alias)
  - `quick` and `cheap` (additional aliases pointing to `fast`)

## Test 2: Use Direct Alias

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer apikey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fast",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Expected Result:**
- Status: 200
- Request routed to synthetic provider with model `hf:MiniMaxAI/MiniMax-M2.1`

## Test 3: Use Additional Alias

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer apikey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "quick",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Expected Result:**
- Status: 200
- Same behavior as Test 2 (routes to synthetic provider)

## Test 4: Passthrough with Provider/Model Format

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer apikey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "synthetic/hf:MiniMaxAI/MiniMax-M2.1",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Expected Result:**
- Status: 200
- Request routed directly to synthetic provider

## Test 5: Unknown Model

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer apikey" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "unknown-model",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Expected Result:**
- Status: 404
- Error: Model not found

## Test 6: Configuration with Multiple Providers (Advanced)

To test multi-provider routing with weighted selection, update your config:

```yaml
providers:
  - name: "openai"
    enabled: true
    apiTypes: ["chat"]
    baseUrls:
      chat: "https://api.openai.com/v1/chat/completions"
    auth:
      type: "bearer"
      apiKeyEnv: "OPENAI_API_KEY"
    models:
      - "gpt-4o"
  
  - name: "azure-openai"
    enabled: true
    apiTypes: ["chat"]
    baseUrls:
      chat: "https://your-resource.openai.azure.com/..."
    auth:
      type: "x-api-key"
      apiKeyEnv: "AZURE_OPENAI_KEY"
    models:
      - "gpt-4o"

models:
  - alias: "smart"
    description: "High-quality model with load balancing"
    targets:
      - provider: "openai"
        model: "gpt-4o"
        weight: 70
      - provider: "azure-openai"
        model: "gpt-4o"
        weight: 30
    selector: "random"
```

Then test weighted distribution:

```bash
for i in {1..10}; do
  curl -s -X POST http://localhost:4000/v1/chat/completions \
    -H "Authorization: Bearer apikey" \
    -H "Content-Type: application/json" \
    -d '{"model": "smart", "messages": [{"role": "user", "content": "Hi"}]}' \
    | jq -r '.model'
done
```

**Expected Result:**
- ~70% of requests go to OpenAI
- ~30% of requests go to Azure OpenAI

## Verification Checklist

- [x] Type definitions created for routing
- [x] Config types extended for model aliases
- [x] Selector strategies implemented (random, in_order)
- [x] Router service implements alias resolution
- [x] GET /v1/models endpoint lists aliases
- [x] Dispatcher uses router for model resolution
- [x] Configuration validation for aliases
- [x] All tests passing (67/67)
- [x] Server starts successfully
- [ ] Manual end-to-end testing completed (requires API keys)

## Architecture Overview

```
Client Request
    ↓
Router.resolve(modelName)
    ↓
┌─────────────────────────┐
│ 1. Check direct alias   │
│ 2. Check additional     │
│    alias                │
│ 3. Try passthrough      │
│    (provider/model)     │
└─────────────────────────┘
    ↓
Filter to enabled providers
    ↓
TargetSelector.select()
    ↓
┌─────────────────────────┐
│ - random (weighted)     │
│ - in_order              │
│ - cost/latency (stub)   │
└─────────────────────────┘
    ↓
ResolvedTarget
    ↓
Dispatcher → Provider
```

## Implementation Summary

### Files Created:
- `packages/backend/src/types/routing.ts` - Routing type definitions
- `packages/backend/src/services/selector.ts` - Target selection strategies
- `packages/backend/src/services/router.ts` - Model alias resolution
- `packages/backend/src/routes/models.ts` - GET /v1/models endpoint
- `packages/backend/tests/selector.test.ts` - Selector unit tests
- `packages/backend/tests/router.test.ts` - Router unit tests

### Files Modified:
- `packages/backend/src/types/config.ts` - Extended model alias schema
- `packages/backend/src/services/dispatcher.ts` - Uses router for model resolution
- `packages/backend/src/config.ts` - Added alias validation
- `packages/backend/src/server.ts` - Added /v1/models route
- `packages/backend/tests/chat-completions.test.ts` - Updated with model aliases
- `config/plexus.yaml` - Added example model alias

### Test Results:
- **67 tests passing** across 8 test files
- **183 expect() assertions** executed
- All selector strategies tested (random, weighted, in_order)
- All router resolution paths tested (direct, additional, passthrough)
- Configuration validation tested
- Error cases covered

## Next Steps (Phase 4)

Phase 4 will add cross-provider transformation, enabling requests in one API style (e.g., OpenAI) to be routed to providers with different native APIs (e.g., Anthropic).
