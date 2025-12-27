import { Hono } from "hono";
import { generateText, LanguageModel } from "ai";
import { convertFromOpenAIChatRequest } from "../../../conversion/completions/request.js";
import { convertToOpenAIChatResponse } from "../../../conversion/completions/response.js";
import { selectProvider } from "../../../routing/selector.js";
import { ProviderFactory } from "../../../providers/factory.js";
import { logger } from "../../../utils/logger.js";
import { createGenerateTextRequest } from "../../utils.js";

// Chat completions route handler
export async function handleChatCompletionsEndpoint(c: any) {
  try {
    // Parse the request body as JSON
    const body = await c.req.json();

    logger.info("Received chat completions request");

    // Convert from OpenAI Chat Completions API format to LanguageModelV2 format
    const convertedRequest = convertFromOpenAIChatRequest(body);

    // Select appropriate provider for the model and get canonical slug
    const { provider: providerConfig, canonicalModelSlug } = selectProvider(convertedRequest);

    // Create provider client
    const providerClient = ProviderFactory.createClient(providerConfig);

    // Get the appropriate model from the provider instance using the canonical slug
    const model: LanguageModel = providerClient.getModel(
      canonicalModelSlug
    );
    const generateTextRequest = createGenerateTextRequest(convertedRequest, model);
    // Call generateText with the model and converted request
    logger.info("Calling generateText on provider client");

    const result = await generateText(generateTextRequest);

    logger.info("Successfully generated text response");

    // Convert the result to OpenAI Chat Completions API response format
    const openAIResponse = convertToOpenAIChatResponse(result);

    return c.json(openAIResponse);
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
