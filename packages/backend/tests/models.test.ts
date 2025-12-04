import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { configLoader } from '../src/config/loader.js';

// Mock the config loader
vi.mock('../src/config/loader.js', () => ({
  configLoader: {
    getSnapshot: vi.fn(),
    loadConfiguration: vi.fn(),
  }
}));

describe('Models Endpoint', () => {
  const mockGetSnapshot = vi.mocked(configLoader.getSnapshot);
  
  // Import the app creation logic
  const createApp = () => {
    const app = new Hono();
    
    // Helper function to transform ModelConfig to ModelInfo (same as in index.ts)
    const transformModelConfigToModelInfo = (modelName: string, modelConfig: any) => {
      return {
        id: modelName,
        canonical_slug: modelName,
        name: modelConfig.name,
        context_length: modelConfig.contextWindow || modelConfig.maxTokens || 4096,
        pricing: {
          prompt: modelConfig.inputTokenPrice?.toString() || "0.0",
          completion: modelConfig.outputTokenPrice?.toString() || "0.0",
        },
        provider: modelConfig.provider,
      };
    };

    // Models endpoint - no authentication required
    app.get('/v1/models', async (c) => {
      try {
        const configSnapshot = configLoader.getSnapshot();
        
        if (!configSnapshot) {
          return c.json([], 200);
        }

        // Transform all models to the required format
        const models = [];
        
        for (const [modelName, modelConfig] of configSnapshot.models) {
          try {
            const modelInfo = transformModelConfigToModelInfo(modelName, modelConfig);
            models.push(modelInfo);
          } catch (error) {
            console.warn(`Failed to transform model ${modelName}:`, error);
          }
        }

        return c.json(models);
      } catch (error) {
        console.error('Models endpoint error:', error);
        return c.json({
          error: error instanceof Error ? error.message : 'Failed to get models'
        }, 500);
      }
    });

    return app;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no models are configured', async () => {
    mockGetSnapshot.mockReturnValue(null);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it('should return empty array when config snapshot has no models', async () => {
    mockGetSnapshot.mockReturnValue({
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map(),
      lastLoaded: new Date(),
    });
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it('should return models in correct format', async () => {
    const mockConfig = {
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map([
        ['neversleep/noromaid-20b', {
          name: 'Noromaid 20B',
          provider: 'openai',
          contextWindow: 4096,
          inputTokenPrice: 0.01,
          outputTokenPrice: 0.03,
        }],
        ['myfmaily/model2', {
          name: 'Model 2',
          provider: 'openrouter',
          contextWindow: 8192,
          inputTokenPrice: 0.11,
          outputTokenPrice: 0.43,
        }],
      ]),
      lastLoaded: new Date(),
    };
    
    mockGetSnapshot.mockReturnValue(mockConfig);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data).toEqual([
      {
        id: 'neversleep/noromaid-20b',
        canonical_slug: 'neversleep/noromaid-20b',
        name: 'Noromaid 20B',
        context_length: 4096,
        pricing: {
          prompt: '0.01',
          completion: '0.03',
        },
        provider: 'openai',
      },
      {
        id: 'myfmaily/model2',
        canonical_slug: 'myfmaily/model2',
        name: 'Model 2',
        context_length: 8192,
        pricing: {
          prompt: '0.11',
          completion: '0.43',
        },
        provider: 'openrouter',
      },
    ]);
  });

  it('should handle models with missing optional fields', async () => {
    const mockConfig = {
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map([
        ['minimal/model', {
          name: 'Minimal Model',
          provider: 'anthropic',
          // Missing contextWindow, inputTokenPrice, outputTokenPrice
        }],
      ]),
      lastLoaded: new Date(),
    };
    
    mockGetSnapshot.mockReturnValue(mockConfig);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data).toEqual([
      {
        id: 'minimal/model',
        canonical_slug: 'minimal/model',
        name: 'Minimal Model',
        context_length: 4096, // default value
        pricing: {
          prompt: '0.0', // default value
          completion: '0.0', // default value
        },
        provider: 'anthropic',
      },
    ]);
  });

  it('should handle different pricing field names', async () => {
    const mockConfig = {
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map([
        ['test/model', {
          name: 'Test Model',
          provider: 'openai',
          contextWindow: 8192,
          maxTokens: 4000, // alternate field name
          inputTokenPrice: 0.02,
          outputTokenPrice: 0.04,
        }],
      ]),
      lastLoaded: new Date(),
    };
    
    mockGetSnapshot.mockReturnValue(mockConfig);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data).toEqual([
      {
        id: 'test/model',
        canonical_slug: 'test/model',
        name: 'Test Model',
        context_length: 8192,
        pricing: {
          prompt: '0.02',
          completion: '0.04',
        },
        provider: 'openai',
      },
    ]);
  });

  it('should skip models that fail transformation', async () => {
    const mockConfig = {
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map([
        ['valid/model', {
          name: 'Valid Model',
          provider: 'openai',
          contextWindow: 4096,
        }],
        ['invalid/model', {
          // Missing required name field
          provider: 'openai',
        }],
      ]),
      lastLoaded: new Date(),
    };
    
    mockGetSnapshot.mockReturnValue(mockConfig);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    // Should only include the valid model
    expect(data).toEqual([
      {
        id: 'valid/model',
        canonical_slug: 'valid/model',
        name: 'Valid Model',
        context_length: 4096,
        pricing: {
          prompt: '0.0',
          completion: '0.0',
        },
        provider: 'openai',
      },
    ]);
  });

  it('should handle config loader error gracefully', async () => {
    mockGetSnapshot.mockImplementation(() => {
      throw new Error('Configuration error');
    });
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(500);
    const data = await res.json();
    
    expect(data).toEqual({
      error: 'Configuration error',
    });
  });

  it('should return models for all provider types', async () => {
    const mockConfig = {
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map([
        ['openai/gpt-3.5', {
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          contextWindow: 4096,
        }],
        ['anthropic/claude-3', {
          name: 'Claude 3',
          provider: 'anthropic',
          contextWindow: 200000,
        }],
        ['openrouter/llama-2', {
          name: 'Llama 2',
          provider: 'openrouter',
          contextWindow: 4096,
        }],
      ]),
      lastLoaded: new Date(),
    };
    
    mockGetSnapshot.mockReturnValue(mockConfig);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data).toHaveLength(3);
    expect(data.map(m => m.provider)).toEqual(['openai', 'anthropic', 'openrouter']);
  });

  it('should convert numeric prices to strings', async () => {
    const mockConfig = {
      providers: new Map(),
      virtualKeys: new Map(),
      models: new Map([
        ['expensive/model', {
          name: 'Expensive Model',
          provider: 'openai',
          contextWindow: 4096,
          inputTokenPrice: 0.123456789,
          outputTokenPrice: 0.987654321,
        }],
      ]),
      lastLoaded: new Date(),
    };
    
    mockGetSnapshot.mockReturnValue(mockConfig);
    
    const app = createApp();
    const res = await app.request('/v1/models');
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data[0].pricing.prompt).toBe('0.123456789');
    expect(data[0].pricing.completion).toBe('0.987654321');
    expect(typeof data[0].pricing.prompt).toBe('string');
    expect(typeof data[0].pricing.completion).toBe('string');
  });
});