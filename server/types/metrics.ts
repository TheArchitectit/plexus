/**
 * Performance metrics for a provider over a time period
 */
export interface ProviderMetrics {
  provider: string;
  period: {
    start: number; // Unix timestamp in ms
    end: number; // Unix timestamp in ms
  };
  requests: number; // Total number of requests
  successRate: number; // Percentage of successful requests (0-1)
  avgLatency: number; // Average latency in ms
  p50Latency: number; // Median latency in ms
  p95Latency: number; // 95th percentile latency in ms
  avgTtft: number; // Average time to first token in ms (streaming only)
  avgThroughput: number; // Average tokens per second (streaming only)
  avgCostPer1M: number; // Average cost per 1M tokens
}

/**
 * Metrics aggregated in a rolling time window
 */
export interface MetricsWindow {
  windowMinutes: number; // Size of the rolling window
  providers: Map<string, ProviderMetrics>; // Metrics per provider
}

/**
 * Individual request metrics data point
 */
export interface RequestMetrics {
  provider: string;
  timestamp: number; // Unix timestamp in ms
  success: boolean;
  latencyMs: number;
  ttftMs: number | null; // Time to first token (null if non-streaming)
  tokensPerSecond: number | null; // Throughput (null if non-streaming)
  costPer1M: number; // Cost per 1M tokens
}
