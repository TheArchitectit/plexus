
import { Hono } from "hono";
import { logger } from "../../utils/logger.js";
import { LLMServerInstance } from "../../lib/llm-server.js";

// Models route handler
export async function handleModelsEndpoint(c: any) {
  try {
    const llmServer = LLMServerInstance.getInstance().server;
    
    logger.info(`Injecting request to LLMServer for models list`);

    const response = await llmServer.app.inject({
        method: 'GET',
        url: '/v1/models'
    });

    if (response.statusCode >= 400) {
        logger.error(`LLMServer models error: ${response.body}`);
        return c.json(JSON.parse(response.body), response.statusCode);
    }

    return c.json(JSON.parse(response.body));
  } catch (error) {
    logger.error("Models endpoint error:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to get models",
      },
      500
    );
  }
}


// Register models routes
export function registerV1ModelsRoutes(app: Hono) {
  // Models endpoint - no authentication required
  app.get("/v1/models", handleModelsEndpoint);
}