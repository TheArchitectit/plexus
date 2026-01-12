import type { ApiType } from "../services/transformer-factory";

/**
 * Metrics collected during streaming
 */
export interface StreamMetrics {
  ttft: number | null; // Time to first token (ms)
  tokensPerSecond: number | null;
  totalTokens: number;
  streamDuration: number; // Total stream time (ms)
}

/**
 * Context for tracking streaming state in Plexus
 */
export interface PlexusStreamContext {
  requestId: string;
  startTime: number;
  firstTokenTime: number | null;
  tokenCount: number;
  clientFormat: ApiType; // Format to send to client
  providerFormat: ApiType; // Format received from provider
  passthrough: boolean; // Skip transformation?
}

/**
 * Options for stream handler
 */
export interface StreamHandlerOptions {
  requestId: string;
  clientFormat: ApiType;
  providerFormat: ApiType;
  onFirstToken?: () => void;
  onToken?: (count: number) => void;
  onComplete?: (metrics: StreamMetrics) => void;
  onError?: (error: Error) => void;
}
