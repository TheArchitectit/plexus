import { Hono } from "hono";
import { generateText, LanguageModel } from "ai";
import superjson from "superjson";
import { selectProvider } from "../selector.js";
import { ProviderFactory } from "../../providers/factory.js";
import { logger } from "../../utils/logger.js";

// AI SDK route handler
export async function handleAiSdkEndpoint(c: any) {
  try {
    // Parse the request body as JSON
    const body = await c.req.json();

    logger.info("Received AI SDK request");

    // Deserialize the request using superjson
    const deserializedRequest = superjson.deserialize(body);

    logger.debug("Deserialized request:", deserializedRequest);

    // Extract model from the deserialized request
    if (!deserializedRequest || typeof deserializedRequest !== 'object') {
      throw new Error("Invalid request format");
    }

    const requestObj = deserializedRequest as any;

    // The model parameter should be a LanguageModel instance in the serialized request
    // We need to extract the model identifier to select a provider
    // For now, we'll look for a model property that contains model information
    if (!requestObj.model) {
      throw new Error("No model specified in the request");
    }

    // Extract model identifier from the model object
    // The model object should have metadata we can use to identify which model to use
    let modelIdentifier: string;
    if (typeof requestObj.model === 'string') {
      modelIdentifier = requestObj.model;
    } else if (typeof requestObj.model === 'object' && requestObj.model.modelId) {
      modelIdentifier = requestObj.model.modelId;
    } else {
      throw new Error("Unable to determine model identifier from request");
    }

    // Create a minimal ConvertedRequest for provider selection
    const convertedRequest = {
      model: modelIdentifier,
      options: {
        prompt: requestObj.prompt || [],
      },
    };

    // Select appropriate provider for the model and get canonical slug
    const { provider: providerConfig, canonicalModelSlug } = selectProvider(convertedRequest);

    // Create provider client
    const providerClient = ProviderFactory.createClient(providerConfig);

    // Get the appropriate model from the provider instance using the canonical slug
    const model: LanguageModel = providerClient.getModel(canonicalModelSlug);

    // Replace the model in the request with the selected provider's model
    requestObj.model = model;

    // Call generateText with the modified request
    logger.info("Calling generateText on provider client");

    const result = await generateText(requestObj);

    logger.info("Successfully generated text response");

    // Serialize the result with superjson
    const serializedResult = superjson.serialize(result);

    return c.json(serializedResult);
  } catch (error) {
    logger.error("AI SDK endpoint error:", error);

    let errorMessage = "Failed to process AI SDK request";
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

// Register AI SDK routes
export function registerV1AiSdkRoutes(app: Hono) {
  // AI SDK endpoint - requires authentication (handled in index.ts)
  app.post("/v1/ai-sdk", handleAiSdkEndpoint);
}
