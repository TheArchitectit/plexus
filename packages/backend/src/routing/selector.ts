
import { configLoader } from "../config/loader.js";
import { ProviderConfig } from "@plexus/types";
import { logger } from "../utils/logger.js";

/**
 * Selects a random provider configuration for a given model.
 *
 * @param modelName - The model identifier
 * @returns An object containing the selected ProviderConfig, providerId and the canonical model slug
 * @throws Error if the model is not found or no providers are available
 */
export function selectProvider(
  modelName: string
): { provider: ProviderConfig; providerId: string; canonicalModelSlug: string } {
  if (!modelName) {
    throw new Error("No model specified");
  }

  // Get the current configuration snapshot
  const configSnapshot = configLoader.getSnapshot();
  if (!configSnapshot) {
    throw new Error("Configuration not loaded");
  }

  // Search for the model in the configuration snapshot
  const modelConfig = configSnapshot.models.get(modelName);
  if (!modelConfig) {
    throw new Error(
      `Model '${modelName}' not found in configuration`
    );
  }

  // Gather the provider IDs and their canonical slugs for this model
  const providerMap = modelConfig.providers;
  if (!providerMap || Object.keys(providerMap).length === 0) {
    throw new Error(
      `No providers configured for model '${modelName}'`
    );
  }

  // Gather the ProviderConfig objects that can serve this model, with their canonical slugs
  const availableProviders: Array<{ config: ProviderConfig; providerId: string; canonicalSlug: string }> = [];
  for (const [providerId, canonicalSlug] of Object.entries(providerMap)) {
    const providerConfig = configSnapshot.providers.get(providerId);
    if (providerConfig) {
      availableProviders.push({
        config: providerConfig,
        providerId,
        canonicalSlug
      });
    }
  }

  if (availableProviders.length === 0) {
    throw new Error(
      `No provider configurations found for model '${
        modelName
      }' with provider IDs: ${Object.keys(providerMap).join(", ")}`
    );
  }

  // Return a random entry from the set of available ProviderConfig objects
  const randomIndex = Math.floor(Math.random() * availableProviders.length);
  const selected = availableProviders[randomIndex];
  
  logger.info(
    `Selected provider: ${selected.config.type} (${selected.providerId}) for model: ${modelName} (canonical: ${selected.canonicalSlug})`
  );
  
  return {
    provider: selected.config,
    providerId: selected.providerId,
    canonicalModelSlug: selected.canonicalSlug
  };
}

