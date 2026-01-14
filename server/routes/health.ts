import { logger } from "../utils/logger";
import type { HealthMonitor } from "../services/health-monitor";
import type { HealthCheckResponse } from "../types/health";

const VERSION = "0.1.0";

/**
 * Health check endpoint handler
 * Returns server health status with timestamp and version
 * Supports ?detail=true query parameter for full system health
 */
export function handleHealth(req: Request, healthMonitor?: HealthMonitor): Response {
  const requestLogger = logger.child({ endpoint: "/health" });
  requestLogger.debug("Health check requested");

  // Check if detailed health was requested
  const url = new URL(req.url);
  const detailParam = url.searchParams.get("detail");
  const includeDetail = detailParam === "true" || detailParam === "1";

  if (includeDetail && healthMonitor) {
    // Return detailed health response
    const systemHealth = healthMonitor.getSystemHealth();
    
    const response: HealthCheckResponse = {
      status: systemHealth.status === "healthy" ? "ok" : systemHealth.status,
      timestamp: systemHealth.timestamp,
      version: VERSION,
      system: systemHealth,
    };

    // Return appropriate HTTP status based on health
    const httpStatus = systemHealth.status === "unhealthy" ? 503 : 200;

    return Response.json(response, { status: httpStatus });
  }

  // Return simple health response
  const basicResponse: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: VERSION,
  };

  return Response.json(basicResponse, { status: 200 });
}

/**
 * Readiness check endpoint handler
 * Returns server readiness status for orchestration systems
 */
export function handleReady(req: Request): Response {
  const requestLogger = logger.child({ endpoint: "/ready" });
  requestLogger.debug("Readiness check requested");

  return Response.json(
    {
      ready: true,
    },
    { status: 200 }
  );
}
