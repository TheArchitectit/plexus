/**
 * Health and cooldown type definitions for resilience management
 */

/**
 * Reasons for placing a provider on cooldown
 */
export type CooldownReason =
  | "rate_limit"       // 429
  | "auth_error"       // 401, 403
  | "timeout"          // Request timeout
  | "server_error"     // 5xx
  | "connection_error" // Network failure
  | "manual";          // Manually set

/**
 * Cooldown entry representing a provider on cooldown
 */
export interface CooldownEntry {
  provider: string;
  reason: CooldownReason;
  startTime: number;       // Unix timestamp ms
  endTime: number;         // Unix timestamp ms
  httpStatus?: number;     // Original HTTP status
  message?: string;        // Error message
  retryAfter?: number;     // From provider header (seconds)
}

/**
 * State of all cooldowns in the system
 */
export interface CooldownState {
  entries: Record<string, CooldownEntry>;  // Key is provider name
  lastUpdated: number;
}

/**
 * Overall system health status
 */
export type SystemHealthStatus = "healthy" | "degraded" | "unhealthy";

/**
 * Health information for a single provider
 */
export interface ProviderHealth {
  name: string;
  enabled: boolean;
  onCooldown: boolean;
  cooldownEntry?: CooldownEntry;
  cooldownRemaining?: number;    // Seconds remaining
}

/**
 * System-wide health information
 */
export interface SystemHealth {
  status: SystemHealthStatus;
  timestamp: string;
  providers: ProviderHealth[];
  summary: {
    total: number;
    healthy: number;
    onCooldown: number;
    disabled: number;
  };
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  system?: SystemHealth;
}

/**
 * Retry-after information extracted from provider response
 */
export interface RetryAfterInfo {
  retryAfter?: number;    // Seconds to wait
  source: "header" | "body" | "default";
}
