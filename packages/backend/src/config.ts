import { z } from 'zod';
import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { logger } from './utils/logger';

// --- Zod Schemas ---

const TransformerConfigSchema = z.object({
  use: z.array(z.tuple([z.string(), z.any()])).optional(),
});

const ProviderConfigSchema = z.object({
  type: z.string(),
  display_name: z.string().optional(),
  api_base_url: z.string().url(),
  api_key: z.string().optional(),
  models: z.array(z.string()).optional(),
  transformer: TransformerConfigSchema.optional(),
});

const ModelTargetSchema = z.object({
  provider: z.string(),
  model: z.string(),
});

const ModelConfigSchema = z.object({
  targets: z.array(ModelTargetSchema),
});

const PlexusConfigSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
  models: z.record(z.string(), ModelConfigSchema),
});

export type PlexusConfig = z.infer<typeof PlexusConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// --- Loader ---

let currentConfig: PlexusConfig | null = null;

export function loadConfig(configPath?: string): PlexusConfig {
  if (currentConfig) return currentConfig;

  // Default path assumes running from packages/backend
  // Adjust logic if needed for production builds
  const defaultPath = path.resolve(process.cwd(), '../../config/plexus.yaml');
  const finalPath = configPath || process.env.PLEXUS_CONFIG_PATH || defaultPath;
  
  logger.info(`Loading configuration from ${finalPath}`);

  if (!fs.existsSync(finalPath)) {
    logger.error(`Configuration file not found at ${finalPath}`);
    throw new Error(`Configuration file not found at ${finalPath}`);
  }

  const fileContents = fs.readFileSync(finalPath, 'utf8');
  const parsed = yaml.parse(fileContents);

  try {
    currentConfig = PlexusConfigSchema.parse(parsed);
    logger.info('Configuration loaded successfully');
    return currentConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed', { errors: error.errors });
    }
    throw error;
  }
}

export function getConfig(): PlexusConfig {
    if (!currentConfig) {
        // Auto-load if not loaded? Or throw?
        // Let's auto-load for convenience if possible
        return loadConfig();
    }
    return currentConfig;
}