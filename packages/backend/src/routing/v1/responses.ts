
import { Hono } from "hono";
import { selectProvider } from "../../routing/selector.js";
import { logger } from "../../utils/logger.js";
import { LLMServerInstance } from "../../lib/llm-server.js";

// Responses API route handler
export async function handleResponsesEndpoint(c: any) {
  try {
    // Parse the request body as JSON
    const body = await c.req.json();

    logger.info("Received responses API request");

    // Select appropriate provider for the model and get canonical slug
    const { providerId, canonicalModelSlug } = selectProvider(body.model);

    logger.info(`Selected provider: ${providerId}, model: ${canonicalModelSlug}`);

    const providerSpecificModel = `${providerId},${canonicalModelSlug}`;
    
    const requestPayload = {
        ...body,
        model: providerSpecificModel
    };

    const llmServer = LLMServerInstance.getInstance().server;
    
    logger.info(`Injecting request to LLMServer with model: ${providerSpecificModel}`);

    const response = await llmServer.app.inject({
        method: 'POST',
        url: '/v1/responses',
        payload: requestPayload
    });

    logger.info(`LLMServer response status: ${response.statusCode}`);

    if (response.statusCode >= 400) {
        logger.error(`LLMServer error: ${response.body}`);
        return c.json(JSON.parse(response.body), response.statusCode);
    }

    return c.json(JSON.parse(response.body));

  } catch (error) {
    logger.error("Responses API endpoint error:", error);

    let errorMessage = "Failed to process responses API request";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return c.json(
      {
        error: errorMessage,
      },
      500
    );
  }
}


// Register responses API routes
export function registerV1ResponsesRoutes(app: Hono) {
  // Responses API endpoint - requires authentication (handled in index.ts)
  app.post("/v1/responses", handleResponsesEndpoint);
}
