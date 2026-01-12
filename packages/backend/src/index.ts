import { loadConfig } from "./config";
import { createServer } from "./server";
import { logger } from "./utils/logger";

async function main() {
  try {
    // Determine config path from environment variable or command line argument
    const envConfigPath = process.env.PLEXUS_CONFIG_PATH;
    const args = process.argv.slice(2);
    const configArgIndex = args.indexOf("--config");
    const argConfigPath = configArgIndex !== -1 ? args[configArgIndex + 1] : null;

    const configPath = argConfigPath || envConfigPath;

    // Load configuration
    const config = await loadConfig(configPath);

    // Configure logger with loaded settings
    logger.configure(config.logging);

    logger.info("Starting Plexus API Gateway", {
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
    });

    // Create and start server
    const { shutdown } = await createServer(config);

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
