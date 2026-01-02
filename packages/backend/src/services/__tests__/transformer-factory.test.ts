import { TransformerFactory } from '../transformer-factory';
import { AnthropicTransformer, OpenAITransformer, GeminiTransformer } from '../../transformers';
import { describe, it, expect } from 'bun:test';

describe('TransformerFactory', () => {
    it('should return AnthropicTransformer for "anthropic"', () => {
        const transformer = TransformerFactory.getTransformer('anthropic');
        expect(transformer).toBeInstanceOf(AnthropicTransformer);
    });

    it('should return GeminiTransformer for "google"', () => {
        const transformer = TransformerFactory.getTransformer('google');
        expect(transformer).toBeInstanceOf(GeminiTransformer);
    });

    it('should return OpenAITransformer for "openai"', () => {
        const transformer = TransformerFactory.getTransformer('openai');
        expect(transformer).toBeInstanceOf(OpenAITransformer);
    });

    it('should be case insensitive', () => {
        expect(TransformerFactory.getTransformer('Anthropic')).toBeInstanceOf(AnthropicTransformer);
        expect(TransformerFactory.getTransformer('GOOGLE')).toBeInstanceOf(GeminiTransformer);
        expect(TransformerFactory.getTransformer('OpenAI')).toBeInstanceOf(OpenAITransformer);
    });

    it('should throw error for unknown provider', () => {
        expect(() => {
            TransformerFactory.getTransformer('unknown-provider');
        }).toThrow('Unsupported provider type: unknown-provider');
    });
});
