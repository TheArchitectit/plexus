# Request/Response Transformation Flow for `/v1/messages`

## Unary, Non-Streaming Request Flow

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

### 5. Response Transformation to Unified Format

**Function:** `transformerFactory.transformResponse`  
**File:** `packages/backend/src/services/dispatcher.ts`  
**Lines:** 248-252

**Are all responses converted to unified format?** 

For non-streaming responses that need transformation: **Yes**. If `sourceApiType === targetApiType`, the response passes through without conversion (optimization at `transformer-factory.ts:131-149`).

For non-streaming, the flow:

- `dispatcher.ts:206` - Checks if streaming by checking Content-Type header
- `dispatcher.ts:248-252` - For non-streaming: Calls `transformerFactory.transformResponse(providerResponse, providerApiType, clientApiType)` where `clientApiType` is `"messages"`
- `transformer-factory.ts:180-189` - If types match: returns wrapped response; if different: converts to unified then to target format

---

### 6. Response Translation (if API types differ)

**Function:** `sourceTransformer.transformResponse` → `targetTransformer.formatResponse`  
**File:** `packages/backend/src/services/transformer-factory.ts`  
**Lines:** 183-184

Called only when `sourceApiType !== targetApiType`:

- Line 183: `unifiedResponse = await sourceTransformer.transformResponse(data)` - Converts provider response to unified format
- Line 184: `targetResponse = await targetTransformer.formatResponse(unifiedResponse)` - Converts unified format to Anthropic messages format

---

### 7. Final Response to Client

**Function:** `Response.json` (returned from `handleMessages`)  
**File:** `packages/backend/src/routes/messages.ts`  
**Line:** 104

The flow:

- `dispatcher.ts:312-315` - Creates Response with JSON body
- `messages.ts:104` - Returns the Response object to client
