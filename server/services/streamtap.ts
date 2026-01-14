import type { DebugLogger } from "./debug-logger";
import type { UsageLogger, RequestContext } from "./usage-logger";
// stream-tap.ts
export class StreamTap {
  debugLogger: DebugLogger;
  requestId: string;
  isFinalPipe: boolean;
  private decoder = new TextDecoder();
  private usageLogger?: UsageLogger;
  private requestContext?: RequestContext;
  private firstTokenRecorded = false;
  
  constructor(
    debugLogger: DebugLogger,
    requestId: string,
    isFinalPipe: boolean = false,
    usageLogger?: UsageLogger,
    requestContext?: RequestContext
  ) {
    this.debugLogger = debugLogger;
    this.requestId = requestId;
    this.isFinalPipe = isFinalPipe;
    this.usageLogger = usageLogger;
    this.requestContext = requestContext;
  }

  /**
   * Taps the stream.
   * 1. Passes data instantly to client.
   * 2. Accumulates data in memory.
   * 3. Fires 'processCompleteLog' only when finished.
   */
  tap(
    inputStream: ReadableStream<Uint8Array>,
    type: "client" | "provider"
  ): ReadableStream<Uint8Array> {
      // Capture the reference here
      const logger = this.debugLogger;
      const requestId = this.requestId;
      const decoder = this.decoder;
      const isFinalPipe = this.isFinalPipe;
      const usageLogger = this.usageLogger;
      const requestContext = this.requestContext;
      let firstTokenRecorded = this.firstTokenRecorded;

    return inputStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
          const textChunk = decoder.decode(chunk, { stream: true });
          
          // Mark first token time when we receive the first chunk with content
          if (!firstTokenRecorded && usageLogger && requestContext && textChunk.trim().length > 0) {
            if (type === "provider") {
              // Track when first token arrives from provider (measures provider performance)
              usageLogger.markFirstToken(requestContext, "provider");
            } else {
              // Track when first token is sent to client (includes transformation overhead)
              usageLogger.markFirstToken(requestContext, "client");
            }
            firstTokenRecorded = true;
          }
          
          if (type === "provider") {
            logger.captureProviderStreamChunk(requestId, textChunk);
          } else {
            logger.captureClientStreamChunk(requestId, textChunk);
          }
        },

        async flush() {
          // Triggered when stream ends successfully
          if (isFinalPipe) {
            await logger.completeTrace(requestId);
          }
        },
        // @ts-ignore: Bun supports cancel() in TransformStream to handle client disconnects
        async cancel(reason) {
          // Triggered when the user hangs up/disconnects
          console.warn(`Stream cancelled for ${requestId}: ${reason}`);
          await logger.completeTrace(requestId);
        },
      })
    );
  }
}
