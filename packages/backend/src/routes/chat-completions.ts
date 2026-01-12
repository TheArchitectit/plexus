import { logger } from "../utils/logger";
import { validateAuthHeader } from "../middleware/auth";
import { Dispatcher } from "../services/dispatcher";
import { PlexusErrorResponse } from "../types/errors";
import { OpenAIChatCompletionRequestSchema } from "../types/openai";
import type { ServerContext } from "../types/server";

/**
 * POST /v1/chat/completions handler
 * Accepts OpenAI-compatible chat completion requests and routes to configured providers
 * Uses the transformation pipeline to handle cross-provider routing
 */
export async function handleChatCompletions(
  req: Request,
  context: ServerContext,
  requestId: string
): Promise<Response> {
  const requestLogger = logger.child({ requestId, endpoint: "/v1/chat/completions" });

  try {
    // Validate authentication
    const auth = validateAuthHeader(req, context.config.apiKeys);
    requestLogger.debug("Request authenticated", { apiKey: auth.apiKeyName });

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      requestLogger.debug("Failed to parse request body");
      throw new PlexusErrorResponse(
        "invalid_request_error",
        "Invalid request body: must be valid JSON",
        400,
        "invalid_json"
      );
    }

    // Validate request against OpenAI schema
    let validatedRequest;
    try {
      validatedRequest = OpenAIChatCompletionRequestSchema.parse(body);
    } catch (error) {
      requestLogger.debug("Request validation failed", { error });
      throw new PlexusErrorResponse(
        "invalid_request_error",
        `Invalid request: ${error instanceof Error ? error.message : "validation error"}`,
        400,
        "invalid_request"
      );
    }

    requestLogger.debug("Request validated", {
      model: validatedRequest.model,
      messageCount: validatedRequest.messages.length,
    });

    // Create dispatcher and process request using the transformation pipeline
    const dispatcher = new Dispatcher(
      context.config,
      context.cooldownManager,
      context.costCalculator,
      context.metricsCollector,
      context.usageLogger,
      context.debugLogger
    );
    const response = await dispatcher.dispatchChatCompletion(validatedRequest, requestId);

    // The dispatcher returns a Response object that's already been transformed
    // to the client's expected format (OpenAI chat completions format)
    return response;
  } catch (error) {
    requestLogger.error("Chat completions request failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Handle PlexusErrorResponse
    if (error instanceof PlexusErrorResponse) {
      return error.toResponse();
    }

    // Generic error response
    const errorResponse = new PlexusErrorResponse(
      "api_error",
      error instanceof Error ? error.message : "Internal server error",
      500
    );
    return errorResponse.toResponse();
  }
}
