/**
 * Transformer Factory Service
 * Creates and manages transformers from @musistudio/llms for cross-provider request/response transformation
 */

import { AnthropicTransformer } from "../lib/llms-transformer/src/transformer/anthropic.transformer";
import { OpenAITransformer } from "../lib/llms-transformer/src/transformer/openai.transformer";
import type { Transformer, TransformerContext } from "../lib/llms-transformer/src/types/transformer";
import type { UnifiedChatRequest } from "../lib/llms-transformer/src/types/llm";
import { logger } from "../utils/logger";

/**
 * Supported API types
 */
export type ApiType = "chat" | "messages";

/**
 * Map of API types to their transformer classes
 */
const TRANSFORMER_MAP: Record<ApiType, new (options?: any) => Transformer> = {
  chat: OpenAITransformer,
  messages: AnthropicTransformer,
};

/**
 * TransformerFactory creates and caches transformer instances
 */
export class TransformerFactory {
  private transformers: Map<ApiType, Transformer> = new Map();

  constructor() {
    // Pre-instantiate transformers with logger
    const openaiTransformer = new OpenAITransformer();
    openaiTransformer.logger = logger;
    this.transformers.set("chat", openaiTransformer);
    
    const anthropicTransformer = new AnthropicTransformer();
    anthropicTransformer.logger = logger;
    this.transformers.set("messages", anthropicTransformer);
  }

  /**
   * Get transformer for a specific API type
   */
  getTransformer(apiType: ApiType): Transformer {
    const transformer = this.transformers.get(apiType);
    if (!transformer) {
      throw new Error(`No transformer found for API type: ${apiType}`);
    }
    return transformer;
  }

  /**
   * Detect API type from endpoint path
   */
  static detectApiType(path: string): ApiType | null {
    if (path.includes("/chat/completions")) {
      return "chat";
    }
    if (path.includes("/messages")) {
      return "messages";
    }
    return null;
  }

  /**
   * Get API type for a provider based on its configured apiTypes
   */
  static getProviderApiType(providerApiTypes: string[]): ApiType {
    if (providerApiTypes.includes("messages")) {
      return "messages";
    }
    // Default to chat (OpenAI-compatible)
    return "chat";
  }

  /**
   * Transform incoming request to unified format
   * @param request - The incoming request body
   * @param sourceApiType - The API type of the incoming request
   * @param context - Transformer context
   * @returns Unified request format
   */
  async transformToUnified(
    request: any,
    sourceApiType: ApiType,
    context: TransformerContext
  ): Promise<UnifiedChatRequest> {
    const transformer = this.getTransformer(sourceApiType);

    // Use transformRequestOut to convert provider format → unified
    if (transformer.transformRequestOut) {
      return transformer.transformRequestOut(request, context);
    }

    // Fallback: return as-is (OpenAITransformer currently has no transformRequestOut)
    return request as UnifiedChatRequest;
  }

  /**
   * Transform unified request to target provider format
   * @param unifiedRequest - Request in unified format
   * @param targetApiType - The API type of the target provider
   * @param provider - Provider configuration for the transformer
   * @param context - Transformer context
   * @returns Provider-specific request format
   */
  async transformFromUnified(
    unifiedRequest: UnifiedChatRequest,
    targetApiType: ApiType,
    provider: any,
    context: TransformerContext
  ): Promise<any> {
    const transformer = this.getTransformer(targetApiType);

    // Use transformRequestIn to convert unified → provider format
    if (transformer.transformRequestIn) {
      return transformer.transformRequestIn(unifiedRequest, provider, context);
    }

    // Fallback: return as-is (OpenAITransformer currently has no transformRequestIn)
    return unifiedRequest;
  }

  /**
   * Transform provider response to client expected format
   * @param response - Response from provider
   * @param sourceApiType - API type of the provider that sent the response
   * @param targetApiType - API type expected by the client
   * @param context - Transformer context
   * @returns Transformed response
   */
  async transformResponse(
    response: Response,
    sourceApiType: ApiType,
    targetApiType: ApiType,
    context: TransformerContext
  ): Promise<Response> {
    // If source and target are the same, no transformation needed
    if (sourceApiType === targetApiType) {
      return response;
    }

    // Get the target transformer (client's expected format)
    const targetTransformer = this.getTransformer(targetApiType);

    // Use transformResponseIn to convert to client's expected format
    // This is used when we need to convert an OpenAI response back to Anthropic format
    if (targetTransformer.transformResponseIn) {
      return targetTransformer.transformResponseIn(response, context);
    }

    return response;
  }

  /**
   * Check if transformation is needed between two API types
   */
  static needsTransformation(sourceApiType: ApiType, targetApiType: ApiType): boolean {
    return sourceApiType !== targetApiType;
  }
}

// Export singleton instance
export const transformerFactory = new TransformerFactory();
