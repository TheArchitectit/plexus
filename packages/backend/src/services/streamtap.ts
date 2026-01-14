import type { DebugLogger } from "./debug-logger";
// stream-tap.ts
export class StreamTap {
  debugLogger: DebugLogger;
  requestId: string;
  isFinalPipe: boolean;
  private decoder = new TextDecoder();
  constructor(
    debugLogger: DebugLogger,
    requestId: string,
    isFinalPipe: boolean = false
  ) {
    this.debugLogger = debugLogger;
    this.requestId = requestId;
    this.isFinalPipe = isFinalPipe;
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

    return inputStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk);
          const textChunk = decoder.decode(chunk, { stream: true });
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
