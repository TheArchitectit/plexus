import {
  generateText,
  streamText
} from 'ai';
import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ProviderConfig,
  ModelConfig
} from '@plexus/types';
import { getProvidersForModel, getModelById } from './config.js';

// Import provider-specific SDKs
import { createOpenAI as createOpenAISDK } from '@ai-sdk/openai';
import { createGoogleGenerativeAI as createGoogleSDK } from '@ai-sdk/google';
import { createOpenRouter as createOpenRouterSDK } from '@openrouter/ai-sdk-provider';

// AI Provider factory and management
export class AIService {
  private providers: Map<string, ProviderConfig> = new Map();
  
  constructor(providers: ProviderConfig[]) {
    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }
  
  private getProviderClient(provider: ProviderConfig) {
    switch (provider.type) {
      case 'google':
        return createGoogleSDK({
          apiKey: provider.apiKey,
        });
        
      case 'openai':
        return createOpenAISDK({
          apiKey: provider.apiKey,
          baseURL: provider.baseURL,
        });
        
      case 'openrouter':
        return createOpenRouterSDK({
          apiKey: provider.apiKey,
          baseURL: provider.baseURL,
        });
        
      case 'openai-compatible':
        return createOpenAISDK({
          apiKey: provider.apiKey,
          baseURL: provider.baseURL,
        });
        
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }
  
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = getModelById(request.model);
    if (!model) {
      throw new Error(`Model '${request.model}' not found`);
    }
    
    const availableProviders = getProvidersForModel(request.model);
    if (availableProviders.length === 0) {
      throw new Error(`No available providers for model '${request.model}'`);
    }
    
    // Try providers in priority order
    const sortedProviders = availableProviders.sort((a, b) => 
      (a.priority || 999) - (b.priority || 999)
    );
    
    let lastError: Error | null = null;
    
    for (const provider of sortedProviders) {
      try {
        return await this.executeWithProvider(provider, model, request);
      } catch (error) {
        console.error(`Provider ${provider.id} failed:`, error);
        lastError = error as Error;
        continue; // Try next provider
      }
    }
    
    throw lastError || new Error('All providers failed');
  }
  
  private async executeWithProvider(
    provider: ProviderConfig, 
    model: ModelConfig, 
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const client = this.getProviderClient(provider);
    
    // Convert chat messages to AI SDK format
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Use generateText for simplicity - for more advanced usage, you could use streamText
    const result = await generateText({
      model: client(model.id),
      messages,
      temperature: request.temperature || model.temperature || 0.7,
      maxTokens: request.max_tokens || model.maxTokens || 4096,
    });
    
    // Convert AI SDK response to OpenAI-compatible format
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.text,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0, // AI SDK doesn't provide token counts directly
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
  
  async *createChatCompletionStream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const model = getModelById(request.model);
    if (!model) {
      throw new Error(`Model '${request.model}' not found`);
    }
    
    const availableProviders = getProvidersForModel(request.model);
    if (availableProviders.length === 0) {
      throw new Error(`No available providers for model '${request.model}'`);
    }
    
    // Try providers in priority order
    const sortedProviders = availableProviders.sort((a, b) => 
      (a.priority || 999) - (b.priority || 999)
    );
    
    let lastError: Error | null = null;
    
    for (const provider of sortedProviders) {
      try {
        for await (const chunk of this.executeStreamWithProvider(provider, model, request)) {
          yield chunk;
        }
        return; // Success, exit the loop
      } catch (error) {
        console.error(`Provider ${provider.id} failed:`, error);
        lastError = error as Error;
        continue; // Try next provider
      }
    }
    
    throw lastError || new Error('All providers failed');
  }
  
  private async *executeStreamWithProvider(
    provider: ProviderConfig, 
    model: ModelConfig, 
    request: ChatCompletionRequest
  ): AsyncIterable<ChatCompletionChunk> {
    const client = this.getProviderClient(provider);
    
    // Convert chat messages to AI SDK format
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Use streamText for streaming responses
    const result = await streamText({
      model: client(model.id),
      messages,
      temperature: request.temperature || model.temperature || 0.7,
      maxTokens: request.max_tokens || model.maxTokens || 4096,
    });
    
    // Stream the response
    let content = '';
    
    for await (const delta of result.textStream) {
      content += delta;
      
      yield {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {
              role: content === delta ? 'assistant' : undefined,
              content: delta,
            },
            finish_reason: null,
          },
        ],
      };
    }
    
    // Send final chunk with finish_reason
    yield {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };
  }
}

// Helper function to create AI service instance
export function createAIService() {
  const providers = getEnabledProviders();
  return new AIService(providers);
}