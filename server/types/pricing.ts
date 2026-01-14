/**
 * Simple per-model pricing configuration
 */
export interface SimplePricing {
  inputPer1M: number; // Cost per 1M input tokens
  outputPer1M: number; // Cost per 1M output tokens
  cachedPer1M?: number; // Cost per 1M cached tokens (optional)
  reasoningPer1M?: number; // Cost per 1M reasoning tokens (optional)
}

/**
 * Tiered pricing based on input token ranges
 */
export interface TieredPricing {
  maxInputTokens: number; // Maximum input tokens for this tier
  inputPer1M: number;
  outputPer1M: number;
  cachedPer1M?: number;
}

/**
 * Pricing configuration for the system
 */
export interface PricingConfig {
  models: Record<string, SimplePricing>; // Model-specific pricing
  tiered?: Record<string, TieredPricing[]>; // Tiered pricing by model
  openrouter?: {
    enabled: boolean;
    cacheRefreshMinutes: number;
  };
  discounts?: Record<string, number>; // Provider discount factors
}

/**
 * Parameters for looking up pricing for a request
 */
export interface PriceLookup {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
}

/**
 * Result of cost calculation
 */
export interface CostResult {
  inputCost: number;
  outputCost: number;
  cachedCost: number;
  reasoningCost: number;
  totalCost: number;
  source: "config" | "openrouter" | "estimated";
  discount: number; // Discount factor applied (1.0 = no discount)
}
