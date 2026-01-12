import type { PlexusConfig } from "./config";
import type { CooldownManager } from "../services/cooldown-manager";
import type { HealthMonitor } from "../services/health-monitor";
import type { UsageLogger } from "../services/usage-logger";
import type { MetricsCollector } from "../services/metrics-collector";
import type { CostCalculator } from "../services/cost-calculator";
import type { DebugLogger } from "../services/debug-logger";

/**
 * Server context containing shared services
 * Passed to all route handlers
 */
export interface ServerContext {
  config: PlexusConfig;
  cooldownManager: CooldownManager;
  healthMonitor: HealthMonitor;
  usageLogger?: UsageLogger;
  metricsCollector?: MetricsCollector;
  costCalculator?: CostCalculator;
  debugLogger?: DebugLogger;
}
