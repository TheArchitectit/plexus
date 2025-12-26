import { Hono } from "hono";
import { convertFromOpenAIChatRequest } from "../conversion/completions/request.js";
import { logger } from "../utils/logger.js";

// Chat completions route handler
export async function handleChatCompletionsEndpoint(c: any) {
  try {
    // Parse the request body as JSON
    const body = await c.req.json();

    logger.info("Received chat completions request");
    logger.debug("Raw request body:", JSON.stringify(body, null, 2));

    // Convert from OpenAI Chat Completions API format to LanguageModelV2 format
    const result = convertFromOpenAIChatRequest(body);

    logger.info("Converted request to LanguageModelV2 format");
    logger.debug("Converted prompt:", JSON.stringify(result.prompt, null, 2));
    logger.debug("Converted options:", JSON.stringify(result.options, null, 2));

    if (result.warnings.length > 0) {
      logger.warn(`Conversion generated ${result.warnings.length} warning(s):`);
      result.warnings.forEach((warning, idx) => {
        logger.warn(`  Warning ${idx + 1}: [${warning.type}] ${warning.message}`);
      });
    }

    // Log the full conversion result
    logger.info("Full conversion result:", JSON.stringify(result, null, 2));

    // Return a placeholder response for now
    return c.json({
      id: "placeholder-chat-completion-id",
      object: "chat.completion",
      created: Date.now(),
      model: body.model || "unknown-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Chat completions endpoint is under construction",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
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