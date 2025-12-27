import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationLoader } from '../loader.js';
import { ProviderConfig, VirtualKeyConfig, ModelConfig } from '@plexus/types';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger.js';

// Mock the file system module
vi.mock('fs/promises');

// Mock the logger to avoid console output during tests
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConfigurationLoader', () => {
  let loader: ConfigurationLoader;
  const testConfigPath = '/test/config';

  beforeEach(() => {
    loader = new ConfigurationLoader(testConfigPath);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfiguration', () => {
    it('should successfully load all configuration files', async () => {
      const mockProviders = {
        openai: {
          type: 'openai',
          apiKey: 'sk-test-key',
        },
      };

      const mockVirtualKeys = {
        'vk-test': {
          key: 'test-key',
        },
      };

      const mockModels = {
        'gpt-4': {
          display_slug: 'gpt-4',
          display_name: 'GPT-4',
          providers: {
            openai: 'gpt-4',
          },
        },
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          return JSON.stringify(mockProviders);
        }
        if (pathStr.includes('virtual-keys.json')) {
          return JSON.stringify(mockVirtualKeys);
        }
        if (pathStr.includes('models.json')) {
          return JSON.stringify(mockModels);
        }
        throw new Error('Unexpected file path');
      });

      const snapshot = await loader.loadConfiguration();

      expect(snapshot.providers.size).toBe(1);
      expect(snapshot.virtualKeys.size).toBe(1);
      expect(snapshot.models.size).toBe(1);
      expect(snapshot.lastLoaded).toBeInstanceOf(Date);
      expect(snapshot.providers.get('openai')).toMatchObject(mockProviders.openai);
      expect(snapshot.virtualKeys.get('vk-test')).toMatchObject(mockVirtualKeys['vk-test']);
      expect(snapshot.models.get('gpt-4')).toMatchObject({
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
      });
    });

    it('should handle missing provider configuration file gracefully', async () => {
      const mockError = new Error('File not found') as NodeJS.ErrnoException;
      mockError.code = 'ENOENT';

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          throw mockError;
        }
        if (pathStr.includes('virtual-keys.json')) {
          return JSON.stringify({});
        }
        if (pathStr.includes('models.json')) {
          return JSON.stringify({});
        }
        throw new Error('Unexpected file path');
      });

      const snapshot = await loader.loadConfiguration();

      expect(snapshot.providers.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Provider configuration file not found, using empty configuration'
      );
    });

    it('should handle missing virtual key configuration file gracefully', async () => {
      const mockError = new Error('File not found') as NodeJS.ErrnoException;
      mockError.code = 'ENOENT';

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          return JSON.stringify({});
        }
        if (pathStr.includes('virtual-keys.json')) {
          throw mockError;
        }
        if (pathStr.includes('models.json')) {
          return JSON.stringify({});
        }
        throw new Error('Unexpected file path');
      });

      const snapshot = await loader.loadConfiguration();

      expect(snapshot.virtualKeys.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Virtual key configuration file not found, using empty configuration'
      );
    });

    it('should handle missing model configuration file gracefully', async () => {
      const mockError = new Error('File not found') as NodeJS.ErrnoException;
      mockError.code = 'ENOENT';

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          return JSON.stringify({});
        }
        if (pathStr.includes('virtual-keys.json')) {
          return JSON.stringify({});
        }
        if (pathStr.includes('models.json')) {
          throw mockError;
        }
        throw new Error('Unexpected file path');
      });

      const snapshot = await loader.loadConfiguration();

      expect(snapshot.models.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Model configuration file not found, using empty configuration'
      );
    });

    it('should throw error for invalid JSON in provider file', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          return 'invalid json {';
        }
        return JSON.stringify({});
      });

      await expect(loader.loadConfiguration()).rejects.toThrow('Configuration loading failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error for other file system errors', async () => {
      const mockError = new Error('Permission denied') as NodeJS.ErrnoException;
      mockError.code = 'EACCES';

      vi.mocked(fs.readFile).mockImplementation(async () => {
        throw mockError;
      });

      await expect(loader.loadConfiguration()).rejects.toThrow('Configuration loading failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getSnapshot', () => {
    it('should return null when no configuration is loaded', () => {
      const snapshot = loader.getSnapshot();
      expect(snapshot).toBeNull();
    });

    it('should return a copy of the configuration snapshot', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({}));

      await loader.loadConfiguration();
      const snapshot1 = loader.getSnapshot();
      const snapshot2 = loader.getSnapshot();

      expect(snapshot1).not.toBeNull();
      expect(snapshot2).not.toBeNull();
      expect(snapshot1).not.toBe(snapshot2); // Should be different objects
      expect(snapshot1).toEqual(snapshot2); // But with same content
    });
  });

  describe('validateProviderConfig', () => {
    it('should validate a correct provider configuration', () => {
      const config = {
        type: 'openai',
        apiKey: 'sk-test-key',
      };

      const validated = loader.validateProviderConfig(config);

      expect(validated).toMatchObject(config);
    });

    it('should validate provider configuration with optional fields', () => {
      const config = {
        type: 'openai',
        apiKey: 'sk-test-key',
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'X-Custom-Header': 'value',
        },
      };

      const validated = loader.validateProviderConfig(config);

      expect(validated).toMatchObject(config);
    });

    it('should reject provider configuration with missing apiKey', () => {
      const config = {
        type: 'openai',
      };

      expect(() => loader.validateProviderConfig(config)).toThrow('Invalid provider configuration');
    });

    it('should reject provider configuration with invalid type', () => {
      const config = {
        type: 'invalid-provider',
        apiKey: 'sk-test-key',
      };

      expect(() => loader.validateProviderConfig(config)).toThrow('Invalid provider configuration');
    });

    it('should reject provider configuration with empty apiKey', () => {
      const config = {
        type: 'openai',
        apiKey: '',
      };

      expect(() => loader.validateProviderConfig(config)).toThrow('Invalid provider configuration');
    });

    it('should reject provider configuration with invalid baseURL', () => {
      const config = {
        type: 'openai',
        apiKey: 'sk-test-key',
        baseURL: 'not-a-url',
      };

      expect(() => loader.validateProviderConfig(config)).toThrow('Invalid provider configuration');
    });
  });

  describe('validateVirtualKeyConfig', () => {
    it('should validate a correct virtual key configuration', () => {
      const config = {
        key: 'test-key',
      };

      const validated = loader.validateVirtualKeyConfig(config);

      expect(validated).toMatchObject(config);
    });

    it('should reject virtual key configuration with missing key', () => {
      const config = {};

      expect(() => loader.validateVirtualKeyConfig(config)).toThrow(
        'Invalid virtual key configuration'
      );
    });

    it('should reject virtual key configuration with key too short', () => {
      const config = {
        key: 'abc',
      };

      expect(() => loader.validateVirtualKeyConfig(config)).toThrow(
        'Invalid virtual key configuration'
      );
    });
  });

  describe('validateModelConfig', () => {
    it('should validate a correct model configuration', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
      };

      const validated = loader.validateModelConfig(config);

      expect(validated).toMatchObject(config);
    });

    it('should validate model configuration with all optional fields', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        pricing_slug: 'gpt-4-pricing',
        providers: {
          openai: 'gpt-4',
        },
        maxTokens: 8192,
        contextWindow: 128000,
        inputTokenPrice: 0.01,
        outputTokenPrice: 0.03,
      };

      const validated = loader.validateModelConfig(config);

      expect(validated).toMatchObject(config);
    });

    it('should reject model configuration with missing display_slug', () => {
      const config = {
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
      };

      expect(() => loader.validateModelConfig(config)).toThrow('Invalid model configuration');
    });

    it('should reject model configuration with empty display_name', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: '',
        providers: {
          openai: 'gpt-4',
        },
      };

      expect(() => loader.validateModelConfig(config)).toThrow('Invalid model configuration');
    });

    it('should reject model configuration with empty providers', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {},
      };

      expect(() => loader.validateModelConfig(config)).toThrow('Invalid model configuration');
    });

    it('should reject model configuration with invalid maxTokens', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
        maxTokens: -1,
      };

      expect(() => loader.validateModelConfig(config)).toThrow('Invalid model configuration');
    });

    it('should reject model configuration with maxTokens exceeding limit', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
        maxTokens: 40000,
      };

      expect(() => loader.validateModelConfig(config)).toThrow('Invalid model configuration');
    });

    it('should reject model configuration with negative price', () => {
      const config = {
        display_slug: 'gpt-4',
        display_name: 'GPT-4',
        providers: {
          openai: 'gpt-4',
        },
        inputTokenPrice: -0.01,
      };

      expect(() => loader.validateModelConfig(config)).toThrow('Invalid model configuration');
    });
  });

  describe('reloadConfiguration', () => {
    it('should reload configuration from disk', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({}));

      const snapshot1 = await loader.loadConfiguration();
      const time1 = snapshot1.lastLoaded;

      // Wait a bit to ensure timestamps differ
      await new Promise((resolve) => setTimeout(resolve, 10));

      const snapshot2 = await loader.reloadConfiguration();
      const time2 = snapshot2.lastLoaded;

      expect(time2.getTime()).toBeGreaterThan(time1.getTime());
    });
  });

  describe('isLoaded', () => {
    it('should return false when configuration is not loaded', () => {
      expect(loader.isLoaded()).toBe(false);
    });

    it('should return true when configuration is loaded', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({}));

      await loader.loadConfiguration();

      expect(loader.isLoaded()).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return status when configuration is not loaded', () => {
      const status = loader.getStatus();

      expect(status).toMatchObject({
        loaded: false,
        lastLoaded: undefined,
        providerCount: 0,
        virtualKeyCount: 0,
        modelCount: 0,
      });
    });

    it('should return status when configuration is loaded', async () => {
      const mockProviders = {
        openai: {
          type: 'openai',
          apiKey: 'sk-test-key',
        },
        anthropic: {
          type: 'anthropic',
          apiKey: 'sk-ant-key',
        },
      };

      const mockVirtualKeys = {
        'vk-test': {
          key: 'test-key',
        },
      };

      const mockModels = {
        'gpt-4': {
          display_slug: 'gpt-4',
          display_name: 'GPT-4',
          providers: {
            openai: 'gpt-4',
          },
        },
        'claude-3': {
          display_slug: 'claude-3',
          display_name: 'Claude 3',
          providers: {
            anthropic: 'claude-3-opus-20240229',
          },
        },
        'gpt-3.5': {
          display_slug: 'gpt-3.5-turbo',
          display_name: 'GPT-3.5 Turbo',
          providers: {
            openai: 'gpt-3.5-turbo',
          },
        },
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          return JSON.stringify(mockProviders);
        }
        if (pathStr.includes('virtual-keys.json')) {
          return JSON.stringify(mockVirtualKeys);
        }
        if (pathStr.includes('models.json')) {
          return JSON.stringify(mockModels);
        }
        throw new Error('Unexpected file path');
      });

      await loader.loadConfiguration();
      const status = loader.getStatus();

      expect(status.loaded).toBe(true);
      expect(status.lastLoaded).toBeInstanceOf(Date);
      expect(status.providerCount).toBe(2);
      expect(status.virtualKeyCount).toBe(1);
      expect(status.modelCount).toBe(3);
    });
  });

  describe('constructor', () => {
    it('should use default config path when none provided', () => {
      const defaultLoader = new ConfigurationLoader();
      const status = defaultLoader.getStatus();

      expect(status).toBeDefined();
    });

    it('should use provided config path', () => {
      const customLoader = new ConfigurationLoader('/custom/path');
      const status = customLoader.getStatus();

      expect(status).toBeDefined();
    });
  });

  describe('multiple providers and models', () => {
    it('should handle multiple providers of different types', async () => {
      const mockProviders = {
        openai: {
          type: 'openai',
          apiKey: 'sk-openai-key',
        },
        anthropic: {
          type: 'anthropic',
          apiKey: 'sk-ant-key',
        },
        openrouter: {
          type: 'openrouter',
          apiKey: 'sk-or-key',
        },
        'custom-openai': {
          type: 'openai-compatible',
          apiKey: 'custom-key',
          baseURL: 'https://custom.api.com/v1',
        },
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('providers.json')) {
          return JSON.stringify(mockProviders);
        }
        return JSON.stringify({});
      });

      const snapshot = await loader.loadConfiguration();

      expect(snapshot.providers.size).toBe(4);
      expect(snapshot.providers.get('openai')?.type).toBe('openai');
      expect(snapshot.providers.get('anthropic')?.type).toBe('anthropic');
      expect(snapshot.providers.get('openrouter')?.type).toBe('openrouter');
      expect(snapshot.providers.get('custom-openai')?.type).toBe('openai-compatible');
    });

    it('should handle models with multiple provider mappings', async () => {
      const mockModels = {
        'gpt-4': {
          display_slug: 'gpt-4',
          display_name: 'GPT-4',
          providers: {
            openai: 'gpt-4',
            openrouter: 'openai/gpt-4',
          },
        },
      };

      vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('models.json')) {
          return JSON.stringify(mockModels);
        }
        return JSON.stringify({});
      });

      const snapshot = await loader.loadConfiguration();

      expect(snapshot.models.size).toBe(1);
      const model = snapshot.models.get('gpt-4');
      expect(model?.providers).toHaveProperty('openai');
      expect(model?.providers).toHaveProperty('openrouter');
    });
  });

  describe('error handling in validation', () => {
    it('should provide detailed error messages for provider validation failures', () => {
      const config = {
        type: 'invalid',
        apiKey: '',
      };

      try {
        loader.validateProviderConfig(config);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid provider configuration');
      }
    });

    it('should provide detailed error messages for model validation failures', () => {
      const config = {
        display_slug: 'test',
        display_name: '',
        providers: {},
      };

      try {
        loader.validateModelConfig(config);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid model configuration');
      }
    });
  });
});
