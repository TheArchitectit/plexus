import { AIConfig, ProviderConfig } from '@plexus/types';

// Configuration for AI providers and models
export const aiConfig: AIConfig = {
  providers: [
    // OpenAI provider
    {
      id: 'openai-primary',
      type: 'openai',
      displayName: 'OpenAI Primary',
      apiKey: process.env.OPENAI_API_KEY || '',
      priority: 1,
      enabled: true,
    },
    
    // Google provider
    {
      id: 'google-primary',
      type: 'google',
      displayName: 'Google AI Primary',
      apiKey: process.env.GOOGLE_API_KEY || '',
      priority: 2,
      enabled: false, // Disabled by default, enable when API key is set
    },
    
    // OpenRouter provider
    {
      id: 'openrouter-primary',
      type: 'openrouter',
      displayName: 'OpenRouter Primary',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      priority: 3,
      enabled: false, // Disabled by default, enable when API key is set
    },
    
    // OpenAI-compatible provider (custom endpoint)
    {
      id: 'custom-openai',
      type: 'openai-compatible',
      displayName: 'Custom OpenAI Compatible',
      apiKey: process.env.CUSTOM_API_KEY || '',
      baseURL: process.env.CUSTOM_BASE_URL || '',
      priority: 4,
      enabled: false, // Disabled by default
    },
  ],
  
  models: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'OpenAI GPT-4o model',
      providerIds: ['openai-primary'],
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
    },
    
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'OpenAI GPT-3.5 Turbo model',
      providerIds: ['openai-primary'],
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
    },
    
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      description: 'Google Gemini Pro model',
      providerIds: ['google-primary'],
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
    },
    
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      description: 'Anthropic Claude 3 Sonnet via OpenRouter',
      providerIds: ['openrouter-primary'],
      maxTokens: 4096,
      temperature: 0.7,
      enabled: true,
    },
  ],
};

// Helper functions for configuration management
export const getEnabledProviders = (): ProviderConfig[] => {
  return aiConfig.providers.filter(provider =>
    provider.enabled && provider.apiKey
  );
};

export const getModelById = (modelId: string) => {
  return aiConfig.models.find(model => model.id === modelId);
};

export const getProvidersForModel = (modelId: string) => {
  const model = getModelById(modelId);
  if (!model) return [];
  
  return getEnabledProviders().filter(provider =>
    model.providerIds.includes(provider.id)
  );
};

export const getEnabledModels = () => {
  return aiConfig.models.filter(model => model.enabled);
};