import type { DebugTraceEntry } from "../types/usage";
import type { ApiType } from "./transformer-factory";
import { DebugStore } from "../storage/debug-store";
import { logger } from "../utils/logger";

/**
 * Configuration for debug logging
 */
export interface DebugConfig {
  enabled: boolean;
  captureRequests: boolean;
  captureResponses: boolean;
  storagePath: string;
  retentionDays: number;
}

/**
 * Service for capturing detailed request/response traces for debugging
 */
export class DebugLogger {
  private store: DebugStore;
  private traces: Map<string, Partial<DebugTraceEntry>> = new Map();

  constructor(private config: DebugConfig) {
    this.store = new DebugStore(config.storagePath, config.retentionDays);
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
    if (!this.config.enabled || !this.config.captureRequests) {
      return;
    }

    this.traces.set(requestId, {
      id: requestId,
      timestamp: new Date().toISOString(),
      clientRequest: {
        apiType: clientApiType,
        body: clientRequest,
        headers: headers || {},
      },
    });

    logger.debug("Debug trace started", { requestId });
  }

  /**
   * Capture the unified request
   * @param requestId - Request ID
   * @param unifiedRequest - Request in unified format
   */
  captureUnifiedRequest(requestId: string, unifiedRequest: any): void {
    if (!this.config.enabled) {
      return;
    }

    const trace = this.traces.get(requestId);
    if (trace) {
      trace.unifiedRequest = unifiedRequest;
    }
  }

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
    if (!this.config.enabled || !this.config.captureRequests) {
      return;
    }

    const trace = this.traces.get(requestId);
    if (trace) {
      trace.providerRequest = {
        apiType: providerApiType,
        body: providerRequest,
        headers: headers || {},
      };
    }
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
    if (!this.config.enabled || !this.config.captureResponses) {
      return;
    }

    const trace = this.traces.get(requestId);
    if (trace) {
      trace.providerResponse = {
        status,
        headers,
        body,
      };
    }
  }

  /**
   * Capture the final client response
   * @param requestId - Request ID
   * @param status - HTTP status code
   * @param body - Response body in client's format
   */
  captureClientResponse(requestId: string, status: number, body: any): void {
    if (!this.config.enabled || !this.config.captureResponses) {
      return;
    }

    const trace = this.traces.get(requestId);
    if (trace) {
      trace.clientResponse = {
        status,
        body,
      };
    }
  }

  /**
   * Capture a stream snapshot (for streaming requests)
   * @param requestId - Request ID
   * @param chunk - Stream chunk
   */
  captureStreamSnapshot(requestId: string, chunk: any): void {
    if (!this.config.enabled || !this.config.captureResponses) {
      return;
    }

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
    if (!this.config.enabled) {
      return;
    }

    const trace = this.traces.get(requestId);
    if (!trace) {
      return;
    }

    try {
      // Ensure required fields are present
      if (!trace.id || !trace.timestamp || !trace.clientRequest) {
        logger.warn("Incomplete debug trace, skipping storage", { requestId });
        return;
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
