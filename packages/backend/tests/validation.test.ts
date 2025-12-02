import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { 
  chatCompletionRequestSchema,
  chatCompletionResponseSchema,
  errorResponseSchema,
  providerConfigSchema,
  virtualKeyConfigSchema,
  modelSchema
} from '@plexus/types';

describe('Request Validation Schemas', () => {
  describe('ChatCompletionRequestSchema', () => {
    it('should validate a valid chat completion request', () => {
      const validRequest = {
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stream: false,
        user: 'user123'
      };

      const result = chatCompletionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validRequest);
      }
    });

    it('should reject request with empty messages', () => {
      const invalidRequest = {
        messages: [],
        model: 'gpt-3.5-turbo'
      };

      const result = chatCompletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one message is required');
      }
    });

    it('should reject request with empty message content', () => {
      const invalidRequest = {
        messages: [
          { role: 'user', content: '' }
        ],
        model: 'gpt-3.5-turbo'
      };

      const result = chatCompletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Message content cannot be empty');
      }
    });

    it('should reject request with invalid temperature', () => {
      const invalidRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        temperature: 3.0 // Invalid: should be 0-2
      };

      const result = chatCompletionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept request with minimal required fields', () => {
      const minimalRequest = {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = chatCompletionRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('ChatCompletionResponseSchema', () => {
    it('should validate a valid chat completion response', () => {
      const validResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };

      const result = chatCompletionResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject response with wrong object type', () => {
      const invalidResponse = {
        id: 'chatcmpl-123',
        object: 'completion', // Wrong object type
        created: 1234567890,
        model: 'gpt-3.5-turbo',
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      };

      const result = chatCompletionResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('ErrorResponseSchema', () => {
    it('should validate a valid error response', () => {
      const validError = {
        error: {
          message: 'Invalid request',
          type: 'validation_error',
          code: 'INVALID_INPUT'
        }
      };

      const result = errorResponseSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should reject error response with missing message', () => {
      const invalidError = {
        error: {
          type: 'validation_error'
        }
      };

      const result = errorResponseSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });
});

describe('Configuration Validation Schemas', () => {
  describe('ProviderConfigSchema', () => {
    it('should validate a valid provider configuration', () => {
      const validConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      };

      const result = providerConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject provider config with missing apiKey', () => {
      const invalidConfig = {
        type: 'openai',
        model: 'gpt-3.5-turbo'
      };

      const result = providerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject provider config with invalid type', () => {
      const invalidConfig = {
        type: 'invalid-provider',
        apiKey: 'sk-test-key'
      };

      const result = providerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject provider config with invalid baseURL', () => {
      const invalidConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
        baseURL: 'not-a-url'
      };

      const result = providerConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('VirtualKeyConfigSchema', () => {
    it('should validate a valid virtual key configuration', () => {
      const validConfig = {
        key: 'test-key',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        priority: 1,
        fallbackProviders: ['anthropic', 'openrouter'],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 3600
        }
      };

      const result = virtualKeyConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject virtual key config with missing key', () => {
      const invalidConfig = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        priority: 1
      };

      const result = virtualKeyConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject virtual key config with invalid priority', () => {
      const invalidConfig = {
        key: 'test-key',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        priority: 0 // Invalid: should be >= 1
      };

      const result = virtualKeyConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('ModelSchema', () => {
    it('should validate a valid model configuration', () => {
      const validConfig = {
        name: 'gpt-3.5-turbo',
        provider: 'openai',
        maxTokens: 4000,
        supportsStreaming: true,
        contextWindow: 8000,
        inputTokenPrice: 0.001,
        outputTokenPrice: 0.002
      };

      const result = modelSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject model config with missing name', () => {
      const invalidConfig = {
        provider: 'openai'
      };

      const result = modelSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should use default value for supportsStreaming', () => {
      const config = {
        name: 'gpt-3.5-turbo',
        provider: 'openai'
      };

      const result = modelSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supportsStreaming).toBe(true);
      }
    });
  });
});

describe('Request Validation Integration', () => {
  const app = new Hono();

  // Error handling middleware (must be first)
  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    
    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      return c.json({ 
        error: 'Invalid request', 
        details: err.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      }, 400);
    }
    
    return c.json({ error: 'Internal Server Error' }, 500);
  });

  app.post('/chat/completions', zValidator('json', chatCompletionRequestSchema), (c) => {
    const data = c.req.valid('json');
    return c.json({ message: 'Valid chat completion request', data });
  });

  it('should accept valid chat completion request', async () => {
    const res = await app.request('/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.messages).toHaveLength(1);
    expect(data.data.model).toBe('gpt-3.5-turbo');
  });

  it('should reject invalid chat completion request', async () => {
    const res = await app.request('/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [], // Invalid: empty messages
        model: 'gpt-3.5-turbo'
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    // Just verify that we get an error response
    expect(data).toBeDefined();
  });

  it('should reject request with invalid temperature', async () => {
    const res = await app.request('/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        temperature: 5.0 // Invalid: should be 0-2
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    // Just verify that we get an error response
    expect(data).toBeDefined();
  });
});