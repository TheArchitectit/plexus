import { ProviderType, ProviderConfig, ProviderClient, ChatCompletionRequest, ModelConfig} from '@plexus/types';
import {generateText, GenerateTextResult, ToolSet, LanguageModel} from 'ai'
import { createAnthropic, AnthropicProvider, AnthropicProviderSettings } from '@ai-sdk/anthropic'

export class AnthropicProviderClient implements ProviderClient {
  public readonly type: ProviderType = 'anthropic';
  readonly config: ProviderConfig
  readonly providerInstance: AnthropicProvider

  constructor(config: ProviderConfig) {
    this.config = config;
    this.providerInstance = createAnthropic(
      {
        apiKey: config.apiKey,
        ...(config.baseURL && { baseURL: config.baseURL }),
        ...(config.headers && { headers: config.headers })
      } as AnthropicProviderSettings
    )
  }

  getModel(modelId: string): any {
    return this.providerInstance(modelId);
  }
}