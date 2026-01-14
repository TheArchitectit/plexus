# Request/Response Transformation Flow for `/v1/chat/completions`

## Unary, Non-Streaming Request Flow

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

---

### 3a. Transformation to Unified Format (if needed)

**Function:** `transformerFactory.transformToUnified`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 141-144

Called from `dispatcher.dispatch()` which is invoked at `chat-completions.ts:68`. The flow:

- `dispatcher.ts:69-94` - `dispatch()` method starts
- `dispatcher.ts:141-144` - Calls `transformerFactory.transformToUnified(request, clientApiType)`
- `transformer-factory.ts:92-98` - Gets transformer and calls `transformer.parseRequest(request)`

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

### 5. Response Transformation to Unified Format

**Function:** `transformerFactory.transformResponse`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 248-252

**Are all responses converted to unified format?** 

**No**. If `sourceApiType === targetApiType`, the response passes through without conversion (optimization at `transformer-factory.ts:131-149`).

For non-streaming, the flow:

- `transformer-factory.ts:180-189` - If types match: returns wrapped response; if different: converts to unified then to target format

---

### 6. Response Translation (if API types differ)

**Function:** `sourceTransformer.transformResponse` → `targetTransformer.formatResponse`  
**File:** `packages/backend/src/services/transformer-factory.ts`  
**Lines:** 183-184

Called only when `sourceApiType !== targetApiType`:

- Line 183: `unifiedResponse = await sourceTransformer.transformResponse(data)` - Converts provider response to unified format
- Line 184: `targetResponse = await targetTransformer.formatResponse(unifiedResponse)` - Converts unified format to client expected format

---

### 7. Final Response to Client

**Function:** `Response.json` (returned from `handleChatCompletions`)  
**File:** `packages/backend/src/routes/chat-completions.ts`  
**Line:** 72

The flow:

- `dispatcher.ts:312-315` - Creates Response with JSON body
- `chat-completions.ts:72` - Returns the Response object to client
