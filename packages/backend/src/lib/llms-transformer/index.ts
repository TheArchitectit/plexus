/**
 * Re-export types and transformers from the cloned llms-transformer library
 * This provides a clean interface for Plexus to use the transformation functionality
 */

// Export types
export type {
  UnifiedChatRequest,
  UnifiedChatResponse,
  UnifiedMessage,
  UnifiedTool,
  MessageContent,
  TextContent,
  ImageContent,
  LLMProvider,
} from "./src/types/llm";

export type {
  Transformer,
  TransformerContext,
  TransformerOptions,
  TransformerConstructor,
} from "./src/types/transformer";

// Export transformers
export { AnthropicTransformer } from "./src/transformer/anthropic.transformer";
export { OpenAITransformer } from "./src/transformer/openai.transformer";

// Export all transformers as a default object
import Transformers from "./src/transformer/index";
export default Transformers;
