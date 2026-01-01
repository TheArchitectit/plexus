import { parse, stringify } from 'yaml';

const API_BASE = ''; // Proxied via server.ts

export interface Stat {
  label: string;
  value: string | number;
  change?: number;
  icon?: string;
}

export interface UsageData {
  timestamp: string;
  requests: number;
  tokens: number;
}

export interface Provider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  enabled: boolean;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  contextWindow: number;
}

// Backend Types
export interface UsageRecord {
    requestId: string;
    date: string;
    sourceIp?: string;
    apiKey?: string;
    incomingApiType?: string;
    provider?: string;
    incomingModelAlias?: string;
    selectedModelName?: string;
    outgoingApiType?: string;
    tokensInput?: number;
    tokensOutput?: number;
    tokensReasoning?: number;
    tokensCached?: number;
    startTime: number;
    durationMs: number;
    isStreamed: boolean;
    responseStatus: string;
}

interface BackendResponse<T> {
    data: T;
    total: number;
    error?: string;
}

interface PlexusConfig {
    providers: Record<string, {
        type: string;
        api_key?: string;
        display_name?: string;
        models?: string[];
        enabled?: boolean; // Custom field we might want to preserve if we could
    }>;
    models?: Record<string, any>;
}

export const api = {
  getStats: async (): Promise<Stat[]> => {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        // Fetch last 1000 requests for stats calculation (approximation)
        const params = new URLSearchParams({
            limit: '1000',
            startDate: startDate.toISOString()
        });
        
        const res = await fetch(`${API_BASE}/v0/management/usage?${params}`);
        if (!res.ok) throw new Error('Failed to fetch usage');
        const json = await res.json() as BackendResponse<UsageRecord[]>;
        
        const records = json.data || [];
        const totalRequests = json.total;
        
        const totalTokens = records.reduce((acc, r) => acc + (r.tokensInput || 0) + (r.tokensOutput || 0), 0);
        const avgLatency = records.length ? Math.round(records.reduce((acc, r) => acc + (r.durationMs || 0), 0) / records.length) : 0;
        
        // Get active providers count
        const configStr = await api.getConfig();
        const config = parse(configStr) as PlexusConfig;
        const activeProviders = Object.keys(config.providers || {}).length;

        return [
            { label: 'Total Requests', value: totalRequests.toLocaleString() }, // Change calculation requires historical comparison
            { label: 'Active Providers', value: activeProviders },
            { label: 'Total Tokens', value: (totalTokens / 1000).toFixed(1) + 'k' },
            { label: 'Avg Latency', value: avgLatency + 'ms' },
        ];
    } catch (e) {
        console.error("API Error getStats", e);
        return [
            { label: 'Total Requests', value: '-' },
            { label: 'Active Providers', value: '-' },
            { label: 'Total Tokens', value: '-' },
            { label: 'Avg Latency', value: '-' },
        ];
    }
  },

  getUsageData: async (): Promise<UsageData[]> => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        const params = new URLSearchParams({
            limit: '2000',
            startDate: startDate.toISOString()
        });
        
        const res = await fetch(`${API_BASE}/v0/management/usage?${params}`);
        if (!res.ok) throw new Error('Failed to fetch usage');
        const json = await res.json() as BackendResponse<UsageRecord[]>;
        const records = json.data || [];

        // Group by day
        const grouped = records.reduce((acc, r) => {
            const day = new Date(r.date).toLocaleDateString();
            if (!acc[day]) acc[day] = { timestamp: day, requests: 0, tokens: 0 };
            acc[day].requests++;
            acc[day].tokens += (r.tokensInput || 0) + (r.tokensOutput || 0);
            return acc;
        }, {} as Record<string, UsageData>);

        // Fill in missing days
        const result: UsageData[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString();
            result.push(grouped[dayStr] || { timestamp: dayStr, requests: 0, tokens: 0 });
        }
        
        return result;
    } catch (e) {
        console.error("API Error getUsageData", e);
        return [];
    }
  },

  getLogs: async (limit: number = 50, offset: number = 0, filters: Record<string, any> = {}): Promise<{ data: UsageRecord[], total: number }> => {
      const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
          ...filters
      });

      const res = await fetch(`${API_BASE}/v0/management/usage?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return await res.json() as BackendResponse<UsageRecord[]>;
  },

  getConfig: async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/v0/management/config`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.text();
  },

  saveConfig: async (config: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/v0/management/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/yaml' }, // or application/x-yaml
        body: config
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save config');
    }
  },

  getProviders: async (): Promise<Provider[]> => {
    try {
        const yamlStr = await api.getConfig();
        const config = parse(yamlStr) as PlexusConfig;
        
        if (!config.providers) return [];

        return Object.entries(config.providers).map(([key, val]) => ({
            id: key,
            name: val.display_name || key,
            type: val.type,
            apiKey: val.api_key || '',
            enabled: true // backend config doesn't have enabled flag yet
        }));
    } catch (e) {
        console.error("API Error getProviders", e);
        return [];
    }
  },

  saveProviders: async (providers: Provider[]): Promise<void> => {
      // 1. Get current config to preserve other sections (like models)
      const yamlStr = await api.getConfig();
      let config: any;
      try {
          config = parse(yamlStr);
      } catch (e) {
          config = { providers: {}, models: {} };
      }

      if (!config) config = {};
      if (!config.providers) config.providers = {};

      // 2. Reconstruct providers object
      // We need to be careful not to lose existing fields if the Provider interface is a subset
      // But here we are assuming the Provider interface is the source of truth for the keys we manage.
      // However, to be safe, we should merge.
      
      // Strategy: Create a new providers object based on input
      const newProvidersObj: Record<string, any> = {};
      
      for (const p of providers) {
          const existing = config.providers[p.id] || {};
          newProvidersObj[p.id] = {
              ...existing, // Keep existing fields like models list if any
              type: p.type,
              api_key: p.apiKey,
              display_name: p.name,
          };
      }
      
      config.providers = newProvidersObj;

      // 3. Save
      const newYaml = stringify(config);
      await api.saveConfig(newYaml);
  },

  getModels: async (): Promise<Model[]> => {
    try {
        const yamlStr = await api.getConfig();
        const config = parse(yamlStr) as PlexusConfig;
        const models: Model[] = [];

        // Extract models from providers
        if (config.providers) {
            Object.entries(config.providers).forEach(([pKey, pVal]) => {
                if (pVal.models) {
                    pVal.models.forEach(m => {
                        models.push({
                            id: m,
                            name: m,
                            providerId: pKey,
                            contextWindow: 0 // Unknown from config
                        });
                    });
                }
            });
        }
        return models;
    } catch (e) {
        console.error("API Error getModels", e);
        return [];
    }
  },
};
