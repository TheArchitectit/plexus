import { Hono } from "hono";
import { configLoader } from "../config/loader.js";

// Configuration status route handler
export async function handleConfigStatusEndpoint(c: any) {
  try {
    const configStatus = configLoader.getStatus();
    return c.json({
      configuration: configStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get configuration status",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}

// Configuration reload route handler
export async function handleConfigReloadEndpoint(c: any) {
  try {
    const newConfig = await configLoader.reloadConfiguration();
    const configStatus = configLoader.getStatus();

    return c.json({
      message: "Configuration reloaded successfully",
      configuration: configStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reload configuration",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
}

// Register configuration routes
export function registerConfigRoutes(app: Hono) {
  // Configuration status endpoint
  app.get("/api/config/status", handleConfigStatusEndpoint);
  
  // Configuration reload endpoint
  app.post("/api/config/reload", handleConfigReloadEndpoint);
}