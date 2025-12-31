
import LLMServer from '@musistudio/llms';
import { configLoader } from '../config/loader.js';
import { logger } from '../utils/logger.js';
import { ProviderConfig } from '@plexus/types';

export class LLMServerInstance {
  private static instance: LLMServerInstance;
  public server: any;
  private initialized: boolean = false;

  private constructor() {
    this.server = new LLMServer({
      logger: false, // We use our own logger
    });
  }

  static getInstance(): LLMServerInstance {
    if (!LLMServerInstance.instance) {
      LLMServerInstance.instance = new LLMServerInstance();
    }
    return LLMServerInstance.instance;
  }

  async initialize() {
    if (this.initialized) {
        return;
    }

    const config = configLoader.getSnapshot();
    if (!config) {
      throw new Error('Configuration not loaded');
    }

    // Map Plexus providers to LLMServer providers
    const llmProviders = Array.from(config.providers.entries()).map(([name, providerConfig]) => {
        return this.mapProvider(name, providerConfig);
    });

    // We can't easily re-configure the server instance fully after creation if we rely on constructor config.
    // However, LLMServer usually has services we can interact with.
    // Based on my investigation, we can use the provider service if exposed, but since it's hard to access,
    // we might need to rely on initialConfig or hacking the internals.
    
    // Actually, looking at the LLMServer constructor, it takes `initialConfig`.
    // Let's create a NEW instance with the correct config.
    
    const serverConfig = {
        providers: llmProviders,
        // We don't need port/host as we won't listen, but might need to provide dummy values
        PORT: 3001, 
        HOST: '127.0.0.1'
    };

    this.server = new LLMServer({
        logger: false,
        initialConfig: serverConfig
    });
    
    // Initialize the server (this usually loads plugins and transformers)
    // We use `ready()` to wait for plugins to load without listening
    await this.server.app.ready();
    
    this.initialized = true;
    logger.info(`LLMServer initialized with ${llmProviders.length} providers`);
  }

  private mapProvider(name: string, config: ProviderConfig): any {
      const configSnapshot = configLoader.getSnapshot();
      const models: string[] = [];
      
      if (configSnapshot) {
          for (const [_, modelConfig] of configSnapshot.models) {
              // check if this model has this providerId in its providers list
              if (modelConfig.providers[name]) {
                  // We use the display_slug as the identifier for routing if needed, 
                  // but LLMServer needs the canonical name usually?
                  // Actually Plexus models map to canonical names.
                  // For LLMServer, we'll list the canonical slug as being available.
                  models.push(modelConfig.providers[name]); 
              }
          }
      }

      const baseProvider = {
          name: name,
          api_key: config.apiKey,
          models: models,
          api_base_url: config.baseURL,
      };

      // Add specific transformers based on provider type
      let transformer: any = {};
      
      if (config.type === 'openai') {
          transformer.use = ['openai'];
      } else if (config.type === 'anthropic') {
          transformer.use = ['Anthropic'];
      } else if (config.type === 'openrouter') {
          transformer.use = ['openrouter'];
      } else {
          // Default to openai-compatible for others
          transformer.use = ['openai'];
      }

      return {
          ...baseProvider,
          transformer
      };
  }
}
