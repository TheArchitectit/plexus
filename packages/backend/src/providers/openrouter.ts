import { ProviderType, ProviderConfig, ProviderClient } from '@plexus/types';
import { LanguageModel } from 'ai';
import { createOpenRouter, OpenRouterProvider, OpenRouterChatSettings } from '@openrouter/ai-sdk-provider';

export class OpenRouterProviderClient implements ProviderClient {
  public readonly type: ProviderType = 'openrouter';
  readonly config: ProviderConfig;
  readonly providerInstance: OpenRouterProvider;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.providerInstance = createOpenRouter(
      {
        apiKey: config.apiKey,
        ...(config.baseURL && { baseURL: config.baseURL }),
        ...(config.headers && { headers: config.headers })
      } as OpenRouterChatSettings
    );
  }

  getModel(modelId: string): LanguageModel {
    return this.providerInstance(modelId);
  }
}
