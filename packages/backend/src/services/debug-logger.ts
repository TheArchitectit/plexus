import type { DebugTraceEntry } from "../types/usage";
import type { ApiType } from "./transformer-factory";
import { DebugStore } from "../storage/debug-store";
import { logger } from "../utils/logger";

/**
 * Configuration for debug logging
 */
export interface DebugConfig {
  enabled: boolean;
  storagePath: string;
  retentionDays: number;
}

/**
 * Service for capturing detailed request/response traces for debugging
 */
export class DebugLogger {
  private store: DebugStore;
  private traces: Map<string, Partial<DebugTraceEntry>> = new Map();

  constructor(private config: DebugConfig, store?: DebugStore) {
    this.store =
      store || new DebugStore(config.storagePath, config.retentionDays);
  }

  /**
   * Initialize debug storage
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info("Debug logging disabled");
      return;
    }

    await this.store.initialize();
    logger.info("Debug logger initialized", {
      storagePath: this.config.storagePath,
      retentionDays: this.config.retentionDays,
    });
  }

   /**
    * Check if debug mode is enabled
    */
   get enabled(): boolean {
     return this.config.enabled;
   }

   /**
    * Helper to analyze object structure and detect non-serializable values
    * @param obj - Object to analyze
    * @returns Info about the object structure and any non-serializable fields
    */
   private getObjectInfo(obj: unknown): Record<string, unknown> {
     if (obj === null || obj === undefined) {
       return { type: String(obj), serializable: true };
     }

     const type = typeof obj;
     const info: Record<string, unknown> = { type };

     if (type === "object") {
       const objInstance = obj as Record<string, unknown>;
       const nonSerializable: string[] = [];
       const keys: string[] = [];

       // Check if it's a special type
     if (obj instanceof Date) {
         return { type: "Date", serializable: true, value: (obj as Date).toISOString() };
    }
       if (obj instanceof Error) {
         return { type: "Error", serializable: false, message: (obj as Error).message };
       }
       if (obj instanceof ReadableStream) {
         return { type: "ReadableStream", serializable: false };
       }
       if (obj instanceof Blob) {
         const blob = obj as Blob;
         return { type: "Blob", serializable: false, blobType: blob.type, size: blob.size };
       }
    if (obj instanceof ArrayBuffer) {
         return { type: "ArrayBuffer", serializable: false, byteLength: (obj as ArrayBuffer).byteLength };
       }
       if (ArrayBuffer.isView(obj)) {
         return { type: "TypedArray", serializable: false };
       }
       if (Array.isArray(obj)) {
         // For arrays, check each element for non-serializable types
      for (let i = 0; i < Math.min(obj.length, 10); i++) {
           const elem = obj[i];
           if (typeof elem === "function" || elem instanceof ReadableStream || elem instanceof Blob) {
             nonSerializable.push(`[${i}]`);
           }
         }
         info.isArray = true;
         info.length = obj.length;
       } else {
         // For objects, check top-level keys
         for (const key in objInstance) {
         if (Object.prototype.hasOwnProperty.call(objInstance, key)) {
         keys.push(key);
         const value = objInstance[key];
             const valueType = typeof value;
             if (valueType === "function" || value instanceof ReadableStream || value instanceof Blob) {
               nonSerializable.push(key);
             }
       }
         }
         info.keys = keys.slice(0, 20); // Limit to first 20 keys
       }

       // Test JSON.stringify
    try {
         JSON.stringify(obj);
         info.serializable = nonSerializable.length === 0;
       } catch {
         info.serializable = false;
       }

       if (nonSerializable.length > 0) {
         info.nonSerializable = nonSerializable;
       }
     } else if (type === "function") {
       info.serializable = false;
     } else {
       info.serializable = true;
     }

     return info;
   }

  /**
   * Start a debug trace for a request
   * @param requestId - Request ID
   * @param clientApiType - Client's API type
   * @param clientRequest - Client's request body
   * @param headers - Request headers
   */
  startTrace(
    requestId: string,
    clientApiType: ApiType,
    clientRequest: any,
    headers?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    this.traces.set(requestId, {
      id: requestId,
      timestamp: new Date().toISOString(),
      clientRequest: {
        apiType: clientApiType,
        body: clientRequest,
        headers: headers || {},
      },
    });

    logger.debug("Started debug trace", { requestId });
  }

  // /**
  //  * Capture the unified request
  //  * @param requestId - Request ID
  //  * @param unifiedRequest - Request in unified format
  //  */
  // captureUnifiedRequest(requestId: string, unifiedRequest: any): void {
  //   if (!this.config.enabled) {
  //     return;
  //   }

  //   const trace = this.traces.get(requestId);
  //   if (trace) {
  //     trace.unifiedRequest = unifiedRequest;
  //   }
  // }

  /**
   * Capture the provider request
   * @param requestId - Request ID
   * @param providerApiType - Provider's API type
   * @param providerRequest - Request in provider's format
   * @param headers - Request headers
   */
   captureProviderRequest(
     requestId: string,
     providerApiType: ApiType,
     providerRequest: any,
     headers?: Record<string, string>
   ): void {
     if (!this.config.enabled) return;

     logger.silly("captureProviderRequest", {
       requestId,
    providerApiType,
       requestInfo: this.getObjectInfo(providerRequest),
     });

     const trace = this.traces.get(requestId);
     if (trace) {
       trace.providerRequest = {
         apiType: providerApiType,
     body: providerRequest,
     headers: headers || {},
       };
     }
     logger.debug("Captured provider request", { requestId });
   }

  /**
   * Capture the provider response
   * @param requestId - Request ID
   * @param status - HTTP status code
   * @param headers - Response headers
   * @param body - Response body
   */
   captureProviderResponse(
     requestId: string,
     status: number,
     headers: Record<string, string>,
     body: any
   ): void {
     if (!this.config.enabled) return;

     logger.silly("captureProviderResponse", {
    requestId,
       status,
       bodyInfo: this.getObjectInfo(body),
     });

     const trace = this.traces.get(requestId);
     if (trace) {
       trace.providerResponse = {
         status,
       headers,
      body,
       };
     }
     logger.debug("Captured provider response", { requestId, status });
   }

  // /**
  //  * Capture the final unified response
  //  * @param requestId - Request ID
  //  * @param unifiedResponse - Response in unified format
  //  */
  // captureUnifiedResponse(requestId: string, unifiedResponse: any): void {
  //   if (!this.config.enabled || !this.config.captureResponses) {
  //     return;
  //   }

  //   const trace = this.traces.get(requestId);
  //   if (trace) {
  //     trace.unifiedResponse = unifiedResponse;
  //   }
  // }

  /**
   * Capture the final client response
   * @param requestId - Request ID
   * @param status - HTTP status code
   * @param body - Response body in client's format
   */
   captureClientResponse(requestId: string, status: number, body: any): void {
     if (!this.config.enabled) return;

     logger.silly("captureClientResponse", {
       requestId,
    status,
       bodyInfo: this.getObjectInfo(body),
     });

     const trace = this.traces.get(requestId);
     if (trace) {
       trace.clientResponse = {
       status,
         body,
       };
     }
     logger.debug("Captured client response", { requestId, status });
   }

  /**
   * Capture a stream snapshot (for streaming requests)
   * @param requestId - Request ID
   * @param chunk - Stream chunk
   */
   captureStreamSnapshot(requestId: string, chunk: any): void {
     if (!this.config.enabled) return;

     logger.silly("captureStreamSnapshot", {
       requestId,
      chunkInfo: this.getObjectInfo(chunk),
     });

     const trace = this.traces.get(requestId);
     if (trace) {
       if (!trace.streamSnapshots) {
         trace.streamSnapshots = [];
       }

       trace.streamSnapshots.push({
         timestamp: new Date().toISOString(),
         chunk,
     });
     }
   }

  /**
   * Complete and store the debug trace
   * @param requestId - Request ID
   */
  async completeTrace(requestId: string): Promise<void> {
    if (!this.config.enabled) return;

    const trace = this.traces.get(requestId);
    if (!trace) {
      return;
    }

    try {
      // If this is a streaming response, populate response bodies with actual stream data
      if (trace.providerResponse?.body?.streaming) {
        // Extract provider raw chunks for providerResponse
        const providerChunks =
          trace.streamSnapshots?.filter(
            (s: any) => s.chunk?.type === "provider_raw"
          ) || [];
        trace.providerResponse.body = {
          streaming: true,
          chunks: providerChunks.map((s: any) => s.chunk),
        };
      }

      // Populate clientResponse with client_raw chunks if available
      if (trace.clientResponse?.body?.streaming) {
        const clientChunks =
          trace.streamSnapshots?.filter(
            (s: any) => s.chunk?.type === "client_raw"
          ) || [];
        trace.clientResponse.body = {
          streaming: true,
          chunks: clientChunks.map((s: any) => s.chunk),
          // The original finalSnapshot is stored separately - merge it here if it exists
          finalChunk: (trace.clientResponse.body as any).finalSnapshot,
        };
      }

       // Ensure required fields are present
       if (!trace.id || !trace.timestamp) {
         logger.warn("Incomplete debug trace, skipping storage", { requestId });
         return;
       }

        logger.debug("About to store trace", {
       requestId,
          hasProviderRequest: !!trace.providerRequest,
          hasProviderResponse: !!trace.providerResponse,
          hasClientResponse: !!trace.clientResponse,
       hasStreamSnapshots: !!(trace.streamSnapshots && trace.streamSnapshots.length > 0),
          streamSnapshotCount: trace.streamSnapshots?.length || 0,
        });

      // Detailed inspection of each trace field
      logger.silly("Trace field inspection - basic fields", {
         requestId,
         idInfo: this.getObjectInfo(trace.id),
      timestampInfo: this.getObjectInfo(trace.timestamp),
       });

        logger.silly("Trace field inspection - requests", {
          requestId,
        clientRequestInfo: this.getObjectInfo(trace.clientRequest),
         clientRequestHeadersInfo: this.getObjectInfo(trace.clientRequest?.headers),
          providerRequestInfo: this.getObjectInfo(trace.providerRequest),
          providerRequestHeadersInfo: this.getObjectInfo(trace.providerRequest?.headers),
       });

        logger.silly("Trace field inspection - responses", {
         requestId,
       providerResponseInfo: this.getObjectInfo(trace.providerResponse),
         providerResponseHeadersInfo: this.getObjectInfo(trace.providerResponse?.headers),
        clientResponseInfo: this.getObjectInfo(trace.clientResponse),
      });

        logger.silly("Trace field inspection - snapshots", {
          requestId,
         streamSnapshotsInfo: this.getObjectInfo(trace.streamSnapshots),
        });

       // Try to stringify the entire trace to see if it fails
       try {
      const stringified = JSON.stringify(trace);
          logger.silly("Trace stringification successful", {
            requestId,
          stringLength: stringified.length,
       });
       } catch (stringifyError) {
        logger.error("Trace stringification failed", {
           requestId,
         error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError),
        });
      }

     // Store the trace
        await this.store.store(trace as DebugTraceEntry);

      logger.debug("Debug trace completed", { requestId });
    } catch (error) {
      logger.error("Failed to complete debug trace", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Clean up from memory
      this.traces.delete(requestId);
    }
  }

  /**
   * Clean up old debug traces
   */
  async cleanup(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await this.store.cleanup();
  }
}
