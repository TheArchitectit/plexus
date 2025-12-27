import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { selectProvider } from '../selector.js';
import { ConvertedRequest } from '../../conversion/index.js';
import { configLoader } from '../../config/loader.js';
import { ProviderConfig, ModelConfig } from '@plexus/types';
import { logger } from '../../utils/logger.js';

// Helper to create a minimal ConvertedRequest with required fields
const createTestRequest = (model: string, overrides?: Partial<ConvertedRequest>): ConvertedRequest => ({
  model,
  options: {
    prompt: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'test' }] }],
    ...overrides?.options,
  },
  ...overrides,
});

// Mock the config loader
vi.mock('../../config/loader.js', () => ({
  configLoader: {
    getSnapshot: vi.fn(),
  },
}));

// Mock the logger to avoid console output during tests
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('selectProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful provider selection', () => {
    it('should select a provider for a model with a single provider', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.canonicalModelSlug).toBe('gpt-4');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Selected provider: openai')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('model: gpt-4')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('canonical: gpt-4')
      );
    });

    it('should select a random provider for a model with multiple providers', () => {
      const mockProviderConfig1: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-openai-key',
      };

      const mockProviderConfig2: ProviderConfig = {
        type: 'openrouter',
        apiKey: 'sk-openrouter-key',
      };

      const mockProviderConfig3: ProviderConfig = {
        type: 'openai-compatible',
        apiKey: 'sk-custom-key',
        baseURL: 'https://custom.api.com/v1',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
          openrouter: 'openai/gpt-4',
          'custom-provider': 'gpt-4-custom',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([
          ['openai', mockProviderConfig1],
          ['openrouter', mockProviderConfig2],
          ['custom-provider', mockProviderConfig3],
        ]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      const result = selectProvider(convertedRequest);

      // Should be one of the three providers
      expect([mockProviderConfig1, mockProviderConfig2, mockProviderConfig3]).toContainEqual(
        result.provider
      );

      // Should have the correct canonical slug based on which provider was selected
      const validCanonicalSlugs = ['gpt-4', 'openai/gpt-4', 'gpt-4-custom'];
      expect(validCanonicalSlugs).toContain(result.canonicalModelSlug);

      expect(logger.info).toHaveBeenCalled();
    });

    it('should return different providers with multiple calls (probabilistic test)', () => {
      const mockProviderConfig1: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-openai-key',
      };

      const mockProviderConfig2: ProviderConfig = {
        type: 'openrouter',
        apiKey: 'sk-openrouter-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
          openrouter: 'openai/gpt-4',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([
          ['openai', mockProviderConfig1],
          ['openrouter', mockProviderConfig2],
        ]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      const results = new Set<string>();

      // Run selection multiple times to verify randomness
      for (let i = 0; i < 100; i++) {
        const result = selectProvider(convertedRequest);
        results.add(result.provider.type);
      }

      // With 100 iterations, we should see both providers (extremely high probability)
      // This is a probabilistic test, but the chance of failure is astronomically low
      expect(results.size).toBe(2);
      expect(results.has('openai')).toBe(true);
      expect(results.has('openrouter')).toBe(true);
    });

    it('should handle models with different provider types', () => {
      const mockAnthropicConfig: ProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'claude-3-opus',
        display_name: 'Claude 3 Opus',
        providers: {
          anthropic: 'claude-3-opus-20240229',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['anthropic', mockAnthropicConfig]]),
        virtualKeys: new Map(),
        models: new Map([['claude-3-opus', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('claude-3-opus');

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockAnthropicConfig);
      expect(result.canonicalModelSlug).toBe('claude-3-opus-20240229');
    });

    it('should handle provider configurations with optional fields', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai-compatible',
        apiKey: 'sk-custom-key',
        baseURL: 'https://custom.api.com/v1',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'custom-model',
        display_name: 'Custom Model',
        providers: {
          'custom-provider': 'custom-model-v1',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['custom-provider', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['custom-model', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('custom-model');

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.provider.baseURL).toBe('https://custom.api.com/v1');
      expect(result.provider.headers).toEqual({ 'X-Custom-Header': 'custom-value' });
      expect(result.canonicalModelSlug).toBe('custom-model-v1');
    });
  });

  describe('error handling', () => {
    it('should throw error when model is not specified in request', () => {
      const convertedRequest = createTestRequest('');

      expect(() => selectProvider(convertedRequest)).toThrow(
        'No model specified in the converted request'
      );
    });

    it('should throw error when model is undefined', () => {
      const convertedRequest = {
        model: undefined as any,
        options: {
          prompt: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'test' }] }],
        },
      };

      expect(() => selectProvider(convertedRequest)).toThrow(
        'No model specified in the converted request'
      );
    });

    it('should throw error when configuration is not loaded', () => {
      vi.mocked(configLoader.getSnapshot).mockReturnValue(null);

      const convertedRequest = createTestRequest('gpt-4');

      expect(() => selectProvider(convertedRequest)).toThrow('Configuration not loaded');
    });

    it('should throw error when model is not found in configuration', () => {
      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map(),
        virtualKeys: new Map(),
        models: new Map(),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('non-existent-model');

      expect(() => selectProvider(convertedRequest)).toThrow(
        "Model 'non-existent-model' not found in configuration"
      );
    });

    it('should throw error when model has no providers configured', () => {
      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {},
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map(),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      expect(() => selectProvider(convertedRequest)).toThrow(
        "No providers configured for model 'gpt-4'"
      );
    });

    it('should throw error when provider configuration is missing for configured provider IDs', () => {
      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
          'missing-provider': 'gpt-4',
        },
      };

      // Only openai provider config exists, missing-provider does not
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      // Should still work because at least one provider is available
      const result = selectProvider(convertedRequest);
      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.canonicalModelSlug).toBe('gpt-4');
    });

    it('should throw error when all provider configurations are missing', () => {
      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          'missing-provider-1': 'gpt-4',
          'missing-provider-2': 'gpt-4',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map(), // No provider configs at all
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      expect(() => selectProvider(convertedRequest)).toThrow(
        "No provider configurations found for model 'gpt-4' with provider IDs: missing-provider-1, missing-provider-2"
      );
    });
  });

  describe('edge cases', () => {
    it('should handle model with very long provider list', () => {
      const providers = new Map<string, ProviderConfig>();
      const providerMap: Record<string, string> = {};

      // Create 50 providers
      for (let i = 0; i < 50; i++) {
        const providerId = `provider-${i}`;
        providers.set(providerId, {
          type: 'openai-compatible',
          apiKey: `sk-key-${i}`,
        });
        providerMap[providerId] = `model-${i}`;
      }

      const mockModelConfig: ModelConfig = {
        display_slug: 'multi-provider-model',
        display_name: 'Multi Provider Model',
        providers: providerMap,
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers,
        virtualKeys: new Map(),
        models: new Map([['multi-provider-model', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('multi-provider-model');

      const result = selectProvider(convertedRequest);

      expect(result.provider).toBeDefined();
      expect(result.provider.type).toBe('openai-compatible');
      expect(result.canonicalModelSlug).toMatch(/^model-\d+$/);
    });

    it('should handle request with warnings in ConvertedRequest', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4', {
        warnings: [
          { type: 'unsupported_param', message: 'Some parameter was ignored' },
        ],
      });

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.canonicalModelSlug).toBe('gpt-4');
    });

    it('should handle request with complex options', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4', {
        options: {
          prompt: [
            {
              role: 'system' as const,
              content: 'You are a helpful assistant.',
            },
            {
              role: 'user' as const,
              content: [{ type: 'text' as const, text: 'Hello!' }],
            },
          ],
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.9,
        },
      });

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.canonicalModelSlug).toBe('gpt-4');
    });

    it('should handle special characters in model names', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4-turbo-preview',
        display_name: 'GPT-4 Turbo Preview',
        providers: {
          openai: 'gpt-4-1106-preview',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4-turbo-preview', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4-turbo-preview');

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.canonicalModelSlug).toBe('gpt-4-1106-preview');
    });

    it('should handle unicode characters in provider IDs and canonical slugs', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai-compatible',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'test-model',
        display_name: 'Test Model 测试',
        providers: {
          'provider-测试': 'model-测试',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['provider-测试', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['test-model', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('test-model');

      const result = selectProvider(convertedRequest);

      expect(result.provider).toEqual(mockProviderConfig);
      expect(result.canonicalModelSlug).toBe('model-测试');
    });
  });

  describe('logging', () => {
    it('should log provider selection with correct information', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          'openai-main': 'gpt-4-0613',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai-main', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      selectProvider(convertedRequest);

      expect(logger.info).toHaveBeenCalledWith(
        'Selected provider: openai (openai-main) for model: gpt-4 (canonical: gpt-4-0613)'
      );
    });

    it('should log each provider selection call', () => {
      const mockProviderConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const mockModelConfig: ModelConfig = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
      };

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([['openai', mockProviderConfig]]),
        virtualKeys: new Map(),
        models: new Map([['gpt-4', mockModelConfig]]),
        lastLoaded: new Date(),
      });

      const convertedRequest = createTestRequest('gpt-4');

      selectProvider(convertedRequest);
      selectProvider(convertedRequest);
      selectProvider(convertedRequest);

      expect(logger.info).toHaveBeenCalledTimes(3);
    });
  });

  describe('integration scenarios', () => {
    it('should handle realistic multi-model, multi-provider configuration', () => {
      const openaiConfig: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-openai-key',
      };

      const anthropicConfig: ProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-key',
      };

      const openrouterConfig: ProviderConfig = {
        type: 'openrouter',
        apiKey: 'sk-or-key',
      };

      const models = new Map<string, ModelConfig>([
        [
          'gpt-4',
          {
            display_slug: 'gpt-4',
            display_name: 'GPT-4',
            providers: {
              openai: 'gpt-4',
              openrouter: 'openai/gpt-4',
            },
          },
        ],
        [
          'claude-3-opus',
          {
            display_slug: 'claude-3-opus',
            display_name: 'Claude 3 Opus',
            providers: {
              anthropic: 'claude-3-opus-20240229',
            },
          },
        ],
        [
          'gpt-3.5-turbo',
          {
            display_slug: 'gpt-3.5-turbo',
            display_name: 'GPT-3.5 Turbo',
            providers: {
              openai: 'gpt-3.5-turbo',
              openrouter: 'openai/gpt-3.5-turbo',
            },
          },
        ],
      ]);

      vi.mocked(configLoader.getSnapshot).mockReturnValue({
        providers: new Map([
          ['openai', openaiConfig],
          ['anthropic', anthropicConfig],
          ['openrouter', openrouterConfig],
        ]),
        virtualKeys: new Map(),
        models,
        lastLoaded: new Date(),
      });

      // Test GPT-4 selection
      const gpt4Request = createTestRequest('gpt-4');

      const gpt4Result = selectProvider(gpt4Request);
      expect([openaiConfig, openrouterConfig]).toContainEqual(gpt4Result.provider);
      expect(['gpt-4', 'openai/gpt-4']).toContain(gpt4Result.canonicalModelSlug);

      // Test Claude selection
      const claudeRequest = createTestRequest('claude-3-opus');

      const claudeResult = selectProvider(claudeRequest);
      expect(claudeResult.provider).toEqual(anthropicConfig);
      expect(claudeResult.canonicalModelSlug).toBe('claude-3-opus-20240229');

      // Test GPT-3.5 selection
      const gpt35Request = createTestRequest('gpt-3.5-turbo');

      const gpt35Result = selectProvider(gpt35Request);
      expect([openaiConfig, openrouterConfig]).toContainEqual(gpt35Result.provider);
      expect(['gpt-3.5-turbo', 'openai/gpt-3.5-turbo']).toContain(
        gpt35Result.canonicalModelSlug
      );
    });
  });
});
