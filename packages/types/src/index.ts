export interface User {
  id: string;
  name: string;
}

// Provider configuration types
export type ProviderType = 'google' | 'openai' | 'openai-compatible' | 'openrouter';

export interface BaseProviderConfig {
  id: string;
  type: ProviderType;
  displayName: string;
  priority?: number; // Lower number = higher priority
  enabled?: boolean;
}

export interface GoogleProviderConfig extends BaseProviderConfig {
  type: 'google';
  apiKey: string;
}

export interface OpenAIProviderConfig extends BaseProviderConfig {
  type: 'openai';
  apiKey: string;
  baseURL?: string;
}

export interface OpenAICompatibleProviderConfig extends BaseProviderConfig {
  type: 'openai-compatible';
  apiKey: string;
  baseURL: string;
}

export interface OpenRouterProviderConfig extends BaseProviderConfig {
  type: 'openrouter';
  apiKey: string;
  baseURL?: string;
}

export type ProviderConfig =
  | GoogleProviderConfig
  | OpenAIProviderConfig
  | OpenAICompatibleProviderConfig
  | OpenRouterProviderConfig;

// Model configuration types
export interface ModelConfig {
  id: string;
  name: string;
  description?: string;
  providerIds: string[]; // References to provider IDs
  maxTokens?: number;
  temperature?: number;
  enabled?: boolean;
}

// Configuration object
export interface AIConfig {
  providers: ProviderConfig[];
  models: ModelConfig[];
}

// Chat completion request/response types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Streaming response types
export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: string | null;
  }>;
}
