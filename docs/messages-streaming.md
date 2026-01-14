# Request/Response Transformation Flow for `/v1/messages`

## Streaming Request Flow

### 1. Initial Request Acceptance

**Function:** `handleMessages`  
**File:** `packages/backend/src/routes/messages.ts`  
**Line:** 11

The request is routed from the server router at `server.ts:107` which calls `handleMessages(req, context, requestId, clientIp)`.

---

### 2. Request Parsing & Validation

**Function:** `handleMessages`  
**File:** `packages/backend/src/routes/messages.ts`  
**Lines:** 50, 61-83

- Line 50: `body = await req.json()` - Parses JSON body
- Lines 61-83: Manual validation of required Anthropic Messages API fields:
  - `model` (line 61-67)
  - `messages` (line 69-75)
  - `max_tokens` (line 77-83)
- The parsed request will include `stream: true` parameter for streaming requests

---

### 3a. Transformation to Unified Format (if needed)

**Function:** `transformerFactory.transformToUnified`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 141-144

Called from `dispatcher.dispatch()` which is invoked at `messages.ts:100` via `dispatcher.dispatchMessages()`. The flow:

- `dispatcher.ts:393-394` - `dispatchMessages()` convenience method calls `dispatch(request, requestId, "messages", clientIp, apiKeyName)`
- `dispatcher.ts:69-94` - `dispatch()` method starts with `clientApiType = "messages"`
- `dispatcher.ts:141-144` - Calls `transformerFactory.transformToUnified(request, clientApiType)` where `clientApiType` is `"messages"`
- `transformer-factory.ts:92-98` - Gets Anthropic transformer and calls `transformer.parseRequest(request)`

---

### 3b. Transformation from Unified to Provider Format (if needed)

**Function:** `transformerFactory.transformFromUnified`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 159-162

The flow:

- `dispatcher.ts:159-162` - Calls `transformerFactory.transformFromUnified(unifiedRequest, providerApiType)`
- `transformer-factory.ts:106-112` - Gets provider transformer and calls `transformer.transformRequest(unifiedRequest)`

---

### 4. Making the Request to Provider

**Function:** `ProviderClient.requestRaw`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 186-193

The flow:

- `dispatcher.ts:180` - Gets endpoint URL via `getEndpointUrl()` (returns `provider.baseUrls.messages` or `provider.baseUrls.chat`)
- `dispatcher.ts:186` - Creates `ProviderClient` instance
- `dispatcher.ts:188-193` - Calls `client.requestRaw({ method, url, body, requestId })`

---

### 5. Detecting Streaming Response

**Function:** `dispatcher.dispatch`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 206, 212-217

- Line 206: `const isStreaming = providerResponse.headers.get("Content-Type")?.includes("text/event-stream")` - Checks if response is streaming
- Line 208-210: Updates request context with streaming flag
- Lines 212-217: Enters streaming path and logs debug info (with `clientApiType` being `"messages"`)

---

### 6. Stream Transformation to Client Format

**Function:** `transformerFactory.transformResponse`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 221-225

The flow:

- `dispatcher.ts:221-225` - Calls `transformerFactory.transformResponse(providerResponse, providerApiType, clientApiType)` for streaming where `clientApiType` is `"messages"`
- `transformer-factory.ts:159-178` - Streaming transformation path:
  - Line 164-166: Checks that both `transformStream` and `formatStream` methods are available
  - Line 169: `unifiedStream = sourceTransformer.transformStream(response.body, debugOptions)` - Converts provider stream to unified stream
  - Line 170: `targetStream = targetTransformer.formatStream(unifiedStream, debugOptions)` - Converts unified stream to Anthropic messages format

---

### 7. Final Streaming Response to Client

**Function:** `Response` (returned from `handleMessages`)  
**File:** `packages/backend/src/routes/messages.ts`  
**Line:** 104

The flow:

- `dispatcher.ts:236-244` - Creates streaming Response with SSE headers:
  ```typescript
  return new Response(stream, {
    status: transformedResponse.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
  ```
- `messages.ts:104` - Returns the streaming Response object to client
