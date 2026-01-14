Things to fix in FE


Future:

Keys: 
Descriptions + : splitting



DEbug Traces:  Requests are good, but no Unified Response is recorded for any path.   For streaming path, the raw provider chunks are not recorded, and the Unified chunks are not recorded.   And for the Client response, only the FINAL chunk is recorded.

For a unary response All the the following should be recorded:

1. Client Request # THIS WORKS, BUT WE SHOULD DO IT EARLIER

chat: in handleChatCompletions, after line 29 where we have the body.  This is the raw client request to capture
messages: in handleMessages, after line 50 where we have the body.  This is the raw client request to capture

2. Unified Request  # NO CHANGES NEEDED

in both paths: in dispatch() after line 141 where we have unifiedRequest

We already do this correctly:
      // Capture unified request (Phase 7)
      if (this.debugLogger?.enabled) {
        this.debugLogger.captureUnifiedRequest(requestId, unifiedRequest);
      }

3. Provider Request

in both paths: in dispatch() after line 159 where we have unifiedRequest

We already do this correctly:
      // Capture provider request (Phase 7)
      if (this.debugLogger?.enabled) {
        this.debugLogger.captureProviderRequest(requestId, providerApiType, providerRequest);
      }


4. Provider Response

chat: (if provider was of type chat):

openai.ts: capture this info  at the end of transformResponse() - its the return value we want
anthropic.ts:  capture this info at the end transformResponse() - its the return value we want

5. Unified Response

We dont need to record this.

6. Client Response

Capture this at the end of openai.formatResponse() or anthropic.formatResponse() - its the return value we want.



we initialize the debugLogger object in dispatch() already:

if (this.debugLogger?.enabled) {
        this.debugLogger.startTrace(requestId, clientApiType, request);
      }








For Streaming:

1. Client Request
2. Unified Request
3. Provider Request
4. Provider Raw Response (unparsed - raw text)
5. All UnifiedChatStreamChunks
6. Client Raw Chunks (unparsed - raw text)