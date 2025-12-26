import { Hono } from "hono";
import { generateText } from 'ai';
import { convertFromOpenAIChatRequest } from "../../../conversion/completions/request.js";
import { convertToOpenAIChatResponse } from "../../../conversion/completions/response.js";
import { selectProvider } from "../../../routing/selector.js";
import { ProviderFactory } from "../../../providers/factory.js";
import { logger } from "../../../utils/logger.js";

// Chat completions route handler
export async function handleChatCompletionsEndpoint(c: any) {
  try {
    // Parse the request body as JSON
    const body = await c.req.json();

    logger.info("Received chat completions request");

    // Convert from OpenAI Chat Completions API format to LanguageModelV2 format
    const convertedRequest = convertFromOpenAIChatRequest(body);

    logger.info("Converted request to LanguageModelV2 format");

    if (convertedRequest.warnings && convertedRequest.warnings.length > 0) {
      logger.warn(`Conversion generated ${convertedRequest.warnings.length} warning(s):`);
      convertedRequest.warnings.forEach((warning, idx) => {
        logger.warn(`  Warning ${idx + 1}: [${warning.type}] ${warning.message}`);
      });
    }

    // Select appropriate provider for the model
    const providerConfig = selectProvider(convertedRequest);
    logger.info(`Selected provider: ${providerConfig.type} for model: ${convertedRequest.model}`);
    
    // Create provider client
    const providerClient = ProviderFactory.createClient(providerConfig);
    logger.info(`Created provider client for: ${providerConfig.type}`);

    // Get the appropriate model from the provider instance
    const model = providerClient.getModel(convertedRequest.model || body.model);
    
    // Call generateText with the model and converted request
    logger.info("Calling generateText on provider client");
    const result = await generateText({
      model,
      messages: convertedRequest.prompt,
      ...convertedRequest.options,
    });

    logger.info("Successfully generated text response");

    // Convert the result to OpenAI Chat Completions API response format
    const openAIResponse = convertToOpenAIChatResponse(result);
    
    return c.json(openAIResponse);
  } catch (error) {
    logger.error("Chat completions endpoint error:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to process chat completions",
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