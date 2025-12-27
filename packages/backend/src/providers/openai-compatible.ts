import { ProviderType, ProviderConfig, ProviderClient} from '@plexus/types';
import {LanguageModel} from 'ai'
import { createOpenAICompatible, OpenAICompatibleProvider, OpenAICompatibleProviderSettings } from '@ai-sdk/openai-compatible';

export class OpenAICompatibleProviderClient implements ProviderClient {
  public readonly type: ProviderType = 'openai-compatible';
  readonly config: ProviderConfig
  readonly providerInstance: OpenAICompatibleProvider

  constructor(config: ProviderConfig) {
    this.config = config;
    this.providerInstance = createOpenAICompatible(
      {
        apiKey: config.apiKey,
        ...(config.baseURL && { baseURL: config.baseURL }),
        ...(config.headers && { headers: config.headers })
      } as OpenAICompatibleProviderSettings
    )
  }

  getModel(modelId: string): LanguageModel {
    return this.providerInstance(modelId);
  }

}