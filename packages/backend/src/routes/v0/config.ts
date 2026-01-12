import { ConfigManager } from "../../services/config-manager";
import type { ConfigUpdateRequest } from "../../types/management";
import { logger } from "../../utils/logger";

export async function handleConfig(req: Request, configManager: ConfigManager): Promise<Response> {
  const method = req.method;

  if (method === "GET") {
    try {
      const configData = await configManager.getConfig();
      return Response.json(configData);
    } catch (error) {
      logger.error("Failed to get config", { error });
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (method === "POST") {
    try {
      const body = await req.json() as ConfigUpdateRequest;
      
      if (!body.config) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Missing 'config' field" 
        }), { status: 400 });
      }

      const result = await configManager.updateConfig(
        body.config,
        body.validate ?? true,
        body.reload ?? true
      );

      return Response.json({
        success: true,
        message: "Configuration updated",
        ...result
      });

    } catch (error) {
      logger.error("Failed to update config", { error });
      
      // Check if it's a validation error
      const message = error instanceof Error ? error.message : "Unknown error";
      const isValidationError = message.includes("Invalid configuration");

      return Response.json({
        success: false,
        message: isValidationError ? "Configuration validation failed" : "Update failed",
        validationErrors: isValidationError ? [message] : undefined
      }, { status: isValidationError ? 400 : 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
