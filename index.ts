import { loadConfig } from "./server/config";
import { createServer } from "./server";
import { logger } from "./server/utils/logger";
import { ConfigManager } from "./server/services/config-manager";
import { EventEmitter } from "./server/services/event-emitter";

async function main() {
  try {
    // Determine config path from environment variable or command line argument
    const args = process.argv.slice(2);
    const configArgIndex = args.indexOf("--config");

    if (configArgIndex === -1 || configArgIndex === args.length - 1) {
      console.error("Error: --config argument is required");
      process.exit(1);
    }

    const configPath = args[configArgIndex + 1];
    logger.debug(`Using config path: ${configPath}`);

    // Load configuration
    const config = await loadConfig(configPath);

    // Configure logger with loaded settings
    logger.configure(config.logging);

    logger.info("Starting Plexus API Gateway", {
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
    });

    // Initialize event emitter for config changes
    const eventEmitter = new EventEmitter(
      config.events?.maxClients,
      config.events?.heartbeatIntervalMs
    );

    // Create config manager with the loaded config path
    const configManager = new ConfigManager(configPath, config, eventEmitter);

    // Create and start server
    const { shutdown } = await createServer(config, configManager, eventEmitter);

    // Handle graceful shutdown
    const shutdownSignals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, initiating graceful shutdown`);
        await shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled rejection", { reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Start the server
main();
