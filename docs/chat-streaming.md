# Request/Response Transformation Flow for `/v1/chat/completions`

## Streaming Request Flow

### 1. Initial Request Acceptance

**Function:** `handleChatCompletions`  
**File:** `packages/backend/src/routes/chat-completions.ts`  
**Line:** 13

The request is routed from the server router at `server.ts:103` which calls `handleChatCompletions(req, context, requestId, clientIp)`.

---

### 2. Request Parsing & Validation

**Function:** `handleChatCompletions`  
**File:** `packages/backend/src/routes/chat-completions.ts`  
**Lines:** 29, 43

- Line 29: `body = await req.json()` - Parses JSON body
- Line 43: `OpenAIChatCompletionRequestSchema.parse(body)` - Validates against OpenAI schema
- The parsed request will include `stream: true` parameter for streaming requests

---

### 3a. Transformation to Unified Format (if needed)

**Function:** `transformerFactory.transformToUnified`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 141-144

Called from `dispatcher.dispatch()` which is invoked at `chat-completions.ts:68`. The flow:

- `dispatcher.ts:69-94` - `dispatch()` method starts
- `dispatcher.ts:141-144` - Calls `transformerFactory.transformToUnified(request, clientApiType)` where `clientApiType` is `"chat"`
- `transformer-factory.ts:92-98` - Gets OpenAI transformer and calls `transformer.parseRequest(request)`

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

- `dispatcher.ts:180` - Gets endpoint URL via `getEndpointUrl()`
- `dispatcher.ts:186` - Creates `ProviderClient` instance
- `dispatcher.ts:188-193` - Calls `client.requestRaw({ method, url, body, requestId })`

---

### 5. Detecting Streaming Response

**Function:** `dispatcher.dispatch`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 206, 212-217

- Line 206: `const isStreaming = providerResponse.headers.get("Content-Type")?.includes("text/event-stream")` - Checks if response is streaming
- Line 208-210: Updates request context with streaming flag
- Lines 212-217: Enters streaming path and logs debug info

---

### 6. Stream Transformation to Client Format

**Function:** `transformerFactory.transformResponse`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 221-225

The flow:

- `dispatcher.ts:221-225` - Calls `transformerFactory.transformResponse(providerResponse, providerApiType, clientApiType)` for streaming
- `transformer-factory.ts:159-178` - Streaming transformation path:
  - Line 164-166: Checks that both `transformStream` and `formatStream` methods are available
  - Line 169: `unifiedStream = sourceTransformer.transformStream(response.body, debugOptions)` - Converts provider stream to unified stream
  - Line 170: `targetStream = targetTransformer.formatStream(unifiedStream, debugOptions)` - Converts unified stream to client format

---

### 7. Final Streaming Response to Client

**Function:** `Response` (returned from `handleChatCompletions`)  
**File:** `packages/backend/src/routes/chat-completions.ts`  
**Line:** 72

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
- `chat-completions.ts:72` - Returns the streaming Response object to client
