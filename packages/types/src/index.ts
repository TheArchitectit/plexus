import { z } from 'zod';

// Chat Completion Request Schema
export const chatCompletionRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1, 'Message content cannot be empty'),
    })
  ).min(1, 'At least one message is required'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(32000).optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  stream: z.boolean().optional(),
  user: z.string().optional(),
});

export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;

// Chat Completion Response Schema
export const chatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
      finish_reason: z.string(),
    })
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

export type ChatCompletionResponse = z.infer<typeof chatCompletionResponseSchema>;

// Error Response Schema
export const errorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.string().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Configuration Schemas
export const providerConfigSchema = z.object({
  type: z.enum(['openai', 'anthropic', 'openrouter']),
  apiKey: z.string().min(1, 'API key is required'),
  baseURL: z.string().url().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(32000).optional(),
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;

export const virtualKeyConfigSchema = z.object({
  key: z.string().min(1, 'Virtual key is required'),
  provider: z.enum(['openai', 'anthropic', 'openrouter']),
  model: z.string().min(1, 'Model is required'),
  priority: z.number().int().min(1),
  fallbackProviders: z.array(z.enum(['openai', 'anthropic', 'openrouter'])).optional(),
  rateLimit: z.object({
    requestsPerMinute: z.number().int().min(1),
    requestsPerHour: z.number().int().min(1),
  }).optional(),
});

export type VirtualKeyConfig = z.infer<typeof virtualKeyConfigSchema>;

export const modelSchema = z.object({
  name: z.string().min(1, 'Model name is required'),
  provider: z.enum(['openai', 'anthropic', 'openrouter']),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  supportsStreaming: z.boolean().default(true),
  contextWindow: z.number().int().min(1).optional(),
  inputTokenPrice: z.number().min(0).optional(),
  outputTokenPrice: z.number().min(0).optional(),
});

export type ModelConfig = z.infer<typeof modelSchema>;

// Provider Types
export type ProviderType = 'openai' | 'anthropic' | 'openrouter';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}



// Provider Client Interface
export interface ProviderClient {
  readonly type: ProviderType;
  readonly config: ProviderConfig;
  
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatCompletionStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void,
    onError?: (error: Error) => void
  ): Promise<void>;
  
  isHealthy(): Promise<boolean>;
  getHealthMetrics(): Promise<ModelHealthMetrics>;
}

// Health Scoring
export interface ModelHealthMetrics {
  provider: ProviderType;
  model: string;
  responseTime: number; // milliseconds
  successRate: number; // 0-1
  errorRate: number; // 0-1
  lastChecked: Date;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface HealthScore {
  overall: number; // 0-100
  latency: number; // 0-100
  reliability: number; // 0-100
  availability: number; // 0-100
}

// Routing Engine Types

export interface RoutingRequest {
  virtualKey: string;
  request: ChatCompletionRequest;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface RoutingResponse {
  provider: ProviderType;
  model: string;
  response: ChatCompletionResponse;
  routingMetadata: {
    selectedProvider: ProviderType;
    healthScore: HealthScore;
    fallbackUsed: boolean;
    retryAttempt: number;
  };
}
