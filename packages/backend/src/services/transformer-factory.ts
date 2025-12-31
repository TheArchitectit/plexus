import { Transformer } from '../types/transformer';
import { AnthropicTransformer, OpenAITransformer } from '../transformers';

export class TransformerFactory {
    static getTransformer(providerType: string): Transformer {
        switch (providerType.toLowerCase()) {
            case 'anthropic':
                return new AnthropicTransformer();
            case 'openai':
            case 'openrouter':
            case 'deepseek':
            case 'groq':
                return new OpenAITransformer();
            default:
                // Default to OpenAI compatible
                return new OpenAITransformer();
        }
    }
}
