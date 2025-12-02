import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigurationLoader } from '../src/config/loader.js';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

describe('Configuration Loader Integration', () => {
  let configLoader: ConfigurationLoader;
  let testConfigDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test configurations
    testConfigDir = path.join(tmpdir(), `plexus-test-${Date.now()}`);
    await fs.mkdir(testConfigDir, { recursive: true });
    configLoader = new ConfigurationLoader(testConfigDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Provider Configuration Loading', () => {
    it('should load and validate provider configurations', async () => {
      const providerConfig = {
        openai: {
          type: 'openai',
          apiKey: 'sk-test-openai-key',
          baseURL: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000
        },
        anthropic: {
          type: 'anthropic',
          apiKey: 'sk-ant-test-anthropic-key',
          model: 'claude-3-sonnet-20240229',
          temperature: 0.7,
          maxTokens: 1000
        }
      };

      // Write provider configuration file
      await fs.writeFile(
        path.join(testConfigDir, 'providers.json'),
        JSON.stringify(providerConfig, null, 2)
      );

      // Load configuration
      const snapshot = await configLoader.loadConfiguration();

      expect(snapshot.providers.size).toBe(2);
      expect(snapshot.providers.has('openai')).toBe(true);
      expect(snapshot.providers.has('anthropic')).toBe(true);

      const openaiConfig = snapshot.providers.get('openai');
      expect(openaiConfig?.type).toBe('openai');
      expect(openaiConfig?.apiKey).toBe('sk-test-openai-key');
      expect(openaiConfig?.model).toBe('gpt-3.5-turbo');
    });

    it('should handle missing provider configuration file', async () => {
      const snapshot = await configLoader.loadConfiguration();

      expect(snapshot.providers.size).toBe(0);
    });

    it('should reject invalid provider configuration', async () => {
      const invalidProviderConfig = {
        openai: {
          type: 'invalid-provider', // Invalid type
          apiKey: '', // Empty API key
          model: 'gpt-3.5-turbo'
        }
      };

      await fs.writeFile(
        path.join(testConfigDir, 'providers.json'),
        JSON.stringify(invalidProviderConfig)
      );

      await expect(configLoader.loadConfiguration()).rejects.toThrow('Invalid provider configuration');
    });
  });

  describe('Virtual Key Configuration Loading', () => {
    it('should load and validate virtual key configurations', async () => {
      const virtualKeyConfig = {
        'test-key-1': {
          key: 'test-key-1',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          priority: 1,
          fallbackProviders: ['anthropic', 'openrouter'],
          rateLimit: {
            requestsPerMinute: 60,
            requestsPerHour: 3600
          }
        },
        'test-key-2': {
          key: 'test-key-2',
          provider: 'anthropic',
          model: 'claude-3-sonnet-20240229',
          priority: 2
        }
      };

      await fs.writeFile(
        path.join(testConfigDir, 'virtual-keys.json'),
        JSON.stringify(virtualKeyConfig, null, 2)
      );

      const snapshot = await configLoader.loadConfiguration();

      expect(snapshot.virtualKeys.size).toBe(2);
      expect(snapshot.virtualKeys.has('test-key-1')).toBe(true);
      expect(snapshot.virtualKeys.has('test-key-2')).toBe(true);

      const key1Config = snapshot.virtualKeys.get('test-key-1');
      expect(key1Config?.provider).toBe('openai');
      expect(key1Config?.fallbackProviders).toEqual(['anthropic', 'openrouter']);
      expect(key1Config?.rateLimit?.requestsPerMinute).toBe(60);
    });

    it('should handle missing virtual key configuration file', async () => {
      const snapshot = await configLoader.loadConfiguration();

      expect(snapshot.virtualKeys.size).toBe(0);
    });

    it('should reject invalid virtual key configuration', async () => {
      const invalidVirtualKeyConfig = {
        'test-key': {
          key: '', // Empty key
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          priority: 0 // Invalid priority
        }
      };

      await fs.writeFile(
        path.join(testConfigDir, 'virtual-keys.json'),
        JSON.stringify(invalidVirtualKeyConfig)
      );

      await expect(configLoader.loadConfiguration()).rejects.toThrow('Invalid virtual key configuration');
    });
  });

  describe('Model Configuration Loading', () => {
    it('should load and validate model configurations', async () => {
      const modelConfig = {
        'gpt-3.5-turbo': {
          name: 'gpt-3.5-turbo',
          provider: 'openai',
          maxTokens: 4000,
          supportsStreaming: true,
          contextWindow: 8000,
          inputTokenPrice: 0.001,
          outputTokenPrice: 0.002
        },
        'claude-3-sonnet': {
          name: 'claude-3-sonnet-20240229',
          provider: 'anthropic',
          maxTokens: 4000,
          supportsStreaming: false,
          contextWindow: 16000
        }
      };

      await fs.writeFile(
        path.join(testConfigDir, 'models.json'),
        JSON.stringify(modelConfig, null, 2)
      );

      const snapshot = await configLoader.loadConfiguration();

      expect(snapshot.models.size).toBe(2);
      expect(snapshot.models.has('gpt-3.5-turbo')).toBe(true);
      expect(snapshot.models.has('claude-3-sonnet')).toBe(true);

      const gptConfig = snapshot.models.get('gpt-3.5-turbo');
      expect(gptConfig?.provider).toBe('openai');
      expect(gptConfig?.supportsStreaming).toBe(true);
      expect(gptConfig?.inputTokenPrice).toBe(0.001);
    });

    it('should handle missing model configuration file', async () => {
      const snapshot = await configLoader.loadConfiguration();

      expect(snapshot.models.size).toBe(0);
    });

    it('should reject invalid model configuration', async () => {
      const invalidModelConfig = {
        'invalid-model': {
          name: '', // Empty name
          provider: 'invalid-provider'
        }
      };

      await fs.writeFile(
        path.join(testConfigDir, 'models.json'),
        JSON.stringify(invalidModelConfig)
      );

      await expect(configLoader.loadConfiguration()).rejects.toThrow('Invalid model configuration');
    });
  });

  describe('Configuration Loader Methods', () => {
    beforeEach(async () => {
      // Set up test configuration files
      const providerConfig = {
        openai: {
          type: 'openai',
          apiKey: 'sk-test-key',
          model: 'gpt-3.5-turbo'
        }
      };

      const virtualKeyConfig = {
        'test-key': {
          key: 'test-key',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          priority: 1
        }
      };

      const modelConfig = {
        'gpt-3.5-turbo': {
          name: 'gpt-3.5-turbo',
          provider: 'openai'
        }
      };

      await fs.writeFile(path.join(testConfigDir, 'providers.json'), JSON.stringify(providerConfig));
      await fs.writeFile(path.join(testConfigDir, 'virtual-keys.json'), JSON.stringify(virtualKeyConfig));
      await fs.writeFile(path.join(testConfigDir, 'models.json'), JSON.stringify(modelConfig));
    });

    it('should provide read-only snapshots', async () => {
      const snapshot1 = await configLoader.loadConfiguration();
      const snapshot2 = configLoader.getSnapshot();

      expect(snapshot2).not.toBeNull();
      expect(snapshot2?.providers.size).toBe(1);
      expect(snapshot2?.virtualKeys.size).toBe(1);
      expect(snapshot2?.models.size).toBe(1);
      expect(snapshot2?.lastLoaded).toBeInstanceOf(Date);
    });

    it('should check if configuration is loaded', async () => {
      expect(configLoader.isLoaded()).toBe(false);

      await configLoader.loadConfiguration();
      expect(configLoader.isLoaded()).toBe(true);
    });

    it('should get configuration status', async () => {
      const statusBefore = configLoader.getStatus();
      expect(statusBefore.loaded).toBe(false);
      expect(statusBefore.providerCount).toBe(0);

      await configLoader.loadConfiguration();
      const statusAfter = configLoader.getStatus();
      expect(statusAfter.loaded).toBe(true);
      expect(statusAfter.providerCount).toBe(1);
      expect(statusAfter.virtualKeyCount).toBe(1);
      expect(statusAfter.modelCount).toBe(1);
      expect(statusAfter.lastLoaded).toBeInstanceOf(Date);
    });

    it('should reload configuration', async () => {
      await configLoader.loadConfiguration();
      const originalSnapshot = configLoader.getSnapshot();

      // Modify configuration file
      const updatedConfig = {
        openai: {
          type: 'openai',
          apiKey: 'sk-updated-key',
          model: 'gpt-4'
        }
      };
      await fs.writeFile(path.join(testConfigDir, 'providers.json'), JSON.stringify(updatedConfig));

      // Reload configuration
      const newSnapshot = await configLoader.reloadConfiguration();

      expect(newSnapshot.providers.size).toBe(1);
      const openaiConfig = newSnapshot.providers.get('openai');
      expect(openaiConfig?.apiKey).toBe('sk-updated-key');
      expect(openaiConfig?.model).toBe('gpt-4');
    });

    it('should validate individual configurations', () => {
      const validProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-3.5-turbo'
      };

      const validatedConfig = configLoader.validateProviderConfig(validProviderConfig);
      expect(validatedConfig.type).toBe('openai');
      expect(validatedConfig.apiKey).toBe('sk-test-key');

      const validVirtualKeyConfig = {
        key: 'test-key',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        priority: 1
      };

      const validatedVirtualKey = configLoader.validateVirtualKeyConfig(validVirtualKeyConfig);
      expect(validatedVirtualKey.key).toBe('test-key');
      expect(validatedVirtualKey.priority).toBe(1);

      const validModelConfig = {
        name: 'gpt-3.5-turbo',
        provider: 'openai'
      };

      const validatedModel = configLoader.validateModelConfig(validModelConfig);
      expect(validatedModel.name).toBe('gpt-3.5-turbo');
      expect(validatedModel.supportsStreaming).toBe(true); // Default value
    });

    it('should throw errors for invalid individual configurations', () => {
      const invalidProviderConfig = {
        type: 'invalid-provider',
        apiKey: ''
      };

      expect(() => configLoader.validateProviderConfig(invalidProviderConfig)).toThrow('Invalid provider configuration');

      const invalidVirtualKeyConfig = {
        key: '',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        priority: 0
      };

      expect(() => configLoader.validateVirtualKeyConfig(invalidVirtualKeyConfig)).toThrow('Invalid virtual key configuration');

      const invalidModelConfig = {
        name: '',
        provider: 'invalid-provider'
      };

      expect(() => configLoader.validateModelConfig(invalidModelConfig)).toThrow('Invalid model configuration');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Create a directory instead of a file to cause read errors
      await fs.mkdir(path.join(testConfigDir, 'providers.json'));

      await expect(configLoader.loadConfiguration()).rejects.toThrow();
    });

    it('should handle JSON parsing errors', async () => {
      // Write invalid JSON
      await fs.writeFile(
        path.join(testConfigDir, 'providers.json'),
        '{ invalid json }'
      );

      await expect(configLoader.loadConfiguration()).rejects.toThrow();
    });
  });
});