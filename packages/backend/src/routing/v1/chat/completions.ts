
import { Hono } from "hono";
import { selectProvider } from "../../../routing/selector.js";
import { logger } from "../../../utils/logger.js";
import { LLMServerInstance } from "../../../lib/llm-server.js";

// Chat completions route handler
export async function handleChatCompletionsEndpoint(c: any) {
  try {
    // Parse the request body as JSON
    const body = await c.req.json();

    logger.info("Received chat completions request");

    // Select appropriate provider for the model and get canonical slug
    const { providerId, canonicalModelSlug } = selectProvider(body.model);

    logger.info(`Selected provider: ${providerId}, model: ${canonicalModelSlug}`);

    // Construct request for LLMServer
    // We target the OpenAI-compatible endpoint of LLMServer /v1/chat/completions
    // But we need to ensure it uses the specific provider we selected.
    // LLMServer config uses "providerName" as key.
    
    // In LLMServer, if we use the unified endpoint /v1/messages, we can pass "provider,model".
    // If we use /v1/chat/completions (OpenAI style), it might rely on the model name matching.
    // To be safe and explicit, we'll use the unified endpoint approach if possible, 
    // OR we modify the model name in the body to "providerName,modelName" if supported by the OpenAI transformer.
    
    // Let's try the direct injection to /v1/chat/completions first, but modifying the model 
    // to be "providerName,modelName" which LLMServer often supports to disambiguate.
    
    // Actually, looking at LLMServer docs, the "model" parameter in unified request is "provider,model".
    // The OpenAI endpoint usually maps to unified request.
    
    const providerSpecificModel = `${providerId},${canonicalModelSlug}`;
    
    const requestPayload = {
        ...body,
        model: providerSpecificModel
    };

    const llmServer = LLMServerInstance.getInstance().server;
    
    logger.info(`Injecting request to LLMServer with model: ${providerSpecificModel}`);

    const response = await llmServer.app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: requestPayload
    });

    logger.info(`LLMServer response status: ${response.statusCode}`);

    if (response.statusCode >= 400) {
        logger.error(`LLMServer error: ${response.body}`);
        return c.json(JSON.parse(response.body), response.statusCode);
    }

    // Stream handling is complex with inject. 
    // If request is streaming, response.body will be the full stream result if we wait.
    // For now, let's assume non-streaming or that we buffer.
    // If the original request wanted stream, we might need to handle it differently.
    
    // For this prototype/experiment, we'll return the JSON response.
    // If the client requested stream, we might need to change strategy or use a different inject method 
    // or direct service call, but inject usually buffers.
    
    // Check content type to see if it's SSE
    if (response.headers['content-type']?.includes('text/event-stream')) {
        // Hono streaming response
        // This is tricky because `inject` buffers by default.
        // We'd need to use `inject` with stream handling or use internal services.
        // For now, let's assume JSON.
        logger.warn("Streaming requested but buffering implementation used.");
    }

    return c.json(JSON.parse(response.body));

  } catch (error) {
    logger.error("Chat completions endpoint error:", error);

    let errorMessage = "Failed to process chat completions";
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


// Register chat completions routes
export function registerV1ChatCompletionsRoutes(app: Hono) {
  // Chat completions endpoint - requires authentication (handled in index.ts)
  app.post("/v1/chat/completions", handleChatCompletionsEndpoint);
}
