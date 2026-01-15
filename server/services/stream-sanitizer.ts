import { logger } from "../utils/logger";

/**
 * StreamSanitizer
 * 
 * Utility to sanitize malformed SSE streams from providers.
 * 
 * Issues this fixes:
 * - Transforms `data: null` to `data: [DONE]` (OpenAI format)
 * - Ensures stream properly closes after [DONE] marker
 * 
 * This is applied only in passthrough scenarios where incomingApiType === providerApiType
 * to fix provider-specific SSE format issues without affecting the transformation pipeline.
 */
export class StreamSanitizer {
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();

  /**
   * Sanitizes a ReadableStream by fixing malformed SSE data.
   * 
   * @param inputStream - The stream to sanitize
   * @returns A sanitized ReadableStream
   */
  sanitize(inputStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const decoder = this.decoder;
    const encoder = this.encoder;
    const reader = inputStream.getReader();
    
    return new ReadableStream({
      async start(controller) {
        let buffer = "";
     let streamEnded = false;
        let lastChunkId = "";
        let lastChunkModel = "";
     let lastChunkCreated = 0;

        try {
          while (!streamEnded) {
        const { done, value } = await reader.read();
          
         if (done) {
      // Process any remaining buffer content
          if (buffer.trim().length > 0) {
              if (buffer.trim() === "data: null") {
                  // Send finish_reason chunk before [DONE]
                  const finishChunk = {
                  id: lastChunkId || `chatcmpl-${Date.now()}`,
                    object: "chat.completion.chunk",
             created: lastChunkCreated || Math.floor(Date.now() / 1000),
                 model: lastChunkModel || "unknown",
             system_fingerprint: null,
               choices: [{
                index: 0,
                      delta: {},
                      logprobs: null,
                  finish_reason: "stop"
                    }],
                  usage: null
                  };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
                  
              // Now send [DONE]
                  const doneMessage = "data: [DONE]\n\n";
           controller.enqueue(encoder.encode(doneMessage));
             } else {
           controller.enqueue(encoder.encode(buffer));
                }
       }
      break;
            }

        // Decode chunk and add to buffer
          const textChunk = decoder.decode(value, { stream: true });
          buffer += textChunk;

            // Process complete lines (SSE format uses \n as line delimiter)
            const lines = buffer.split('\n');
          
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || "";

      for (const line of lines) {
            // Check for malformed "data: null" line
           if (line.trim() === "data: null") {
              // Send finish_reason chunk before [DONE]
      logger.info("StreamSanitizer: Detected 'data: null', sending finish_reason and [DONE]");
           
              const finishChunk = {
              id: lastChunkId || `chatcmpl-${Date.now()}`,
             object: "chat.completion.chunk",
           created: lastChunkCreated || Math.floor(Date.now() / 1000),
                model: lastChunkModel || "unknown",
                system_fingerprint: null,
                choices: [{
             index: 0,
                  delta: {},
                  logprobs: null,
              finish_reason: "stop"
                }],
                usage: null
            };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
              
              // Now send [DONE]
         const doneMessage = "data: [DONE]\n\n";
           controller.enqueue(encoder.encode(doneMessage));
      streamEnded = true;
           // Cancel the upstream reader to stop receiving more data
             await reader.cancel();
       break;
         }
           
              // Extract metadata from data lines for use in finish chunk
              if (line.trim().startsWith("data: {")) {
          try {
                  const jsonStr = line.trim().substring(6); // Remove "data: " prefix
                const chunk = JSON.parse(jsonStr);
                  if (chunk.id) lastChunkId = chunk.id;
                  if (chunk.model) lastChunkModel = chunk.model;
                if (chunk.created) lastChunkCreated = chunk.created;
                } catch (e) {
                // Ignore parse errors, we'll use defaults
                }
              }
              
        // Pass through normal lines unchanged
              controller.enqueue(encoder.encode(line + '\n'));
            }
       }
        } catch (error) {
          // If an error occurs, ensure we clean up properly
       logger.error("StreamSanitizer error", { error });
       throw error;
        } finally {
          // Always release the lock and close the controller
          reader.releaseLock();
          controller.close();
    }
      },
      
      async cancel(reason) {
     // If the downstream cancels, propagate to upstream
      logger.debug("StreamSanitizer: downstream cancelled", { reason });
      try {
          await reader.cancel(reason);
        } catch (e) {
          // Ignore errors during cancel
          logger.debug("StreamSanitizer: Error during cancel", { error: e });
    }
      },
    });
  }
}

// Export singleton instance
export const streamSanitizer = new StreamSanitizer();
