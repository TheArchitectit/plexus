import { logger } from "./utils/logger";
import { handleHealth, handleReady } from "./routes/health";
import { handleChatCompletions } from "./routes/chat-completions";
import { handleMessages } from "./routes/messages";
import { handleModels } from "./routes/models";
import type { PlexusConfig } from "./types/config";
import type { ServerContext } from "./types/server";
import { randomUUID } from "crypto";
import { createRequestId } from "./utils/headers";
import { CooldownManager } from "./services/cooldown-manager";
import { HealthMonitor } from "./services/health-monitor";
import { UsageStore } from "./storage/usage-store";
import { ErrorStore } from "./storage/error-store";
import { CostCalculator } from "./services/cost-calculator";
import { MetricsCollector } from "./services/metrics-collector";
import { UsageLogger } from "./services/usage-logger";
import { DebugLogger } from "./services/debug-logger";

/**
 * Request router - maps URLs to handlers
 */
async function router(req: Request, context: ServerContext): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Add request ID for correlation
  const requestId = createRequestId();
  const requestLogger = logger.child({ requestId });

  requestLogger.debug("Incoming request", {
    method: req.method,
    path,
  });

  // Route handlers
  if (path === "/health" && req.method === "GET") {
    return handleHealth(req, context.healthMonitor);
  }

  if (path === "/ready" && req.method === "GET") {
    return handleReady(req);
  }

  if (path === "/v1/chat/completions" && req.method === "POST") {
    return handleChatCompletions(req, context, requestId);
  }

  if (path === "/v1/messages" && req.method === "POST") {
    return handleMessages(req, context, requestId);
  }

  if (path === "/v1/models" && req.method === "GET") {
    return handleModels(req, context.config, requestId);
  }

  // 404 for unknown routes
  requestLogger.debug("Route not found", { path });
  return Response.json(
    {
      error: "Not Found",
      message: `Route ${path} not found`,
    },
    { status: 404 }
  );
}

/**
 * Creates and starts the HTTP server
 */
export async function createServer(config: PlexusConfig): Promise<{ server: any; shutdown: () => Promise<void> }> {
  // Initialize resilience services
  const cooldownManager = new CooldownManager(config);
  const healthMonitor = new HealthMonitor(config, cooldownManager);

  // Initialize observability services (Phase 7)
  let usageLogger: UsageLogger | undefined;
  let metricsCollector: MetricsCollector | undefined;
  let costCalculator: CostCalculator | undefined;
  let debugLogger: DebugLogger | undefined;

  if (config.logging.usage?.enabled) {
    // Initialize storage
    const usageStore = new UsageStore(
      config.logging.usage.storagePath,
      config.logging.usage.retentionDays
    );
    await usageStore.initialize();

    const errorStore = new ErrorStore(
      config.logging.errors.storagePath,
      config.logging.errors.retentionDays
    );
    await errorStore.initialize();

    // Initialize cost calculator
    costCalculator = new CostCalculator(config.pricing);

    // Initialize metrics collector (5 minute rolling window)
    metricsCollector = new MetricsCollector(5);

    // Initialize usage logger
    usageLogger = new UsageLogger(
      usageStore,
      errorStore,
      costCalculator,
      metricsCollector,
      true
    );

    logger.info("Observability services initialized");
  }

  // Initialize debug logger (Phase 7)
  if (config.logging.debug?.enabled) {
    debugLogger = new DebugLogger({
      enabled: config.logging.debug.enabled,
      captureRequests: config.logging.debug.captureRequests,
      captureResponses: config.logging.debug.captureResponses,
      storagePath: config.logging.debug.storagePath,
      retentionDays: config.logging.debug.retentionDays,
    });
    await debugLogger.initialize();
    logger.info("Debug logger initialized");
  }

  const context: ServerContext = {
    config,
    cooldownManager,
    healthMonitor,
    usageLogger,
    metricsCollector,
    costCalculator,
    debugLogger,
  };

  const server = Bun.serve({
    port: config.server.port,
    hostname: config.server.host,
    fetch: (req: Request) => router(req, context),
  });

  logger.info("Server started", {
    host: config.server.host,
    port: config.server.port,
    url: `http://${config.server.host}:${config.server.port}`,
  });

  // Graceful shutdown handler
  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down server...");
    server.stop();
    logger.info("Server shutdown complete");
  };

  return { server, shutdown };
}
