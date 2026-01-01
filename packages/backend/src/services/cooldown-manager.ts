import { logger } from '../utils/logger';
import { UsageStorageService } from './usage-storage';

interface Target {
    provider: string;
    model: string;
}

export class CooldownManager {
    private static instance: CooldownManager;
    private cooldowns: Map<string, number> = new Map();
    private readonly defaultCooldownMinutes = 10;
    private storage: UsageStorageService | null = null;

    private constructor() {}

    public static getInstance(): CooldownManager {
        if (!CooldownManager.instance) {
            CooldownManager.instance = new CooldownManager();
        }
        return CooldownManager.instance;
    }

    public async setStorage(storage: UsageStorageService) {
        this.storage = storage;
        await this.loadFromStorage();
    }

    private async loadFromStorage() {
        if (!this.storage) return;
        try {
            const db = this.storage.getDb();
            const now = Date.now();
            
            // Clean up expired first
            db.run("DELETE FROM provider_cooldowns WHERE expiry < ?", [now]);
            
            const rows = db.query("SELECT provider, expiry FROM provider_cooldowns").all() as { provider: string, expiry: number }[];
            
            this.cooldowns.clear();
            for (const row of rows) {
                if (row.expiry > now) {
                    this.cooldowns.set(row.provider, row.expiry);
                }
            }
            logger.info(`Loaded ${this.cooldowns.size} active cooldowns from storage`);
        } catch (e) {
            logger.error("Failed to load cooldowns from storage", e);
        }
    }

    private getCooldownDuration(): number {
        const envVal = process.env.PLEXUS_PROVIDER_COOLDOWN_MINUTES;
        const minutes = envVal ? parseInt(envVal, 10) : this.defaultCooldownMinutes;
        return (isNaN(minutes) ? this.defaultCooldownMinutes : minutes) * 60 * 1000;
    }

    public markProviderFailure(provider: string): void {
        const duration = this.getCooldownDuration();
        const expiry = Date.now() + duration;
        this.cooldowns.set(provider, expiry);
        
        logger.warn(`Provider '${provider}' placed on cooldown for ${duration / 60000} minutes until ${new Date(expiry).toISOString()}`);

        if (this.storage) {
            try {
                this.storage.getDb().run(
                    "INSERT OR REPLACE INTO provider_cooldowns (provider, expiry, created_at) VALUES (?, ?, ?)",
                    [provider, expiry, Date.now()]
                );
            } catch (e) {
                logger.error(`Failed to persist cooldown for ${provider}`, e);
            }
        }
    }

    public isProviderHealthy(provider: string): boolean {
        const expiry = this.cooldowns.get(provider);
        if (!expiry) return true;

        if (Date.now() > expiry) {
            this.cooldowns.delete(provider);
            
            if (this.storage) {
                try {
                    this.storage.getDb().run("DELETE FROM provider_cooldowns WHERE provider = ?", [provider]);
                } catch (e) {
                    logger.error(`Failed to remove expired cooldown for ${provider}`, e);
                }
            }

            logger.info(`Provider '${provider}' cooldown expired, marking as healthy`);
            return true;
        }

        return false;
    }

    public filterHealthyTargets(targets: Target[]): Target[] {
        return targets.filter(target => this.isProviderHealthy(target.provider));
    }
    
    // Helper specifically for the requested signature, though filterHealthyTargets is more versatile
    public removeCooldowns(targets: Target[]): Target[] {
        return this.filterHealthyTargets(targets);
    }

    public getCooldowns(): { provider: string, expiry: number, timeRemainingMs: number }[] {
        const now = Date.now();
        const results = [];
        for (const [provider, expiry] of this.cooldowns.entries()) {
            if (expiry > now) {
                results.push({
                    provider,
                    expiry,
                    timeRemainingMs: expiry - now
                });
            } else {
                // Should be cleaned up on next check, but for reporting we ignore it
            }
        }
        return results;
    }

    public clearCooldown(provider?: string): void {
        if (provider) {
            this.cooldowns.delete(provider);
            logger.info(`Manually cleared cooldown for provider '${provider}'`);
            if (this.storage) {
                try {
                    this.storage.getDb().run("DELETE FROM provider_cooldowns WHERE provider = ?", [provider]);
                } catch (e) {
                    logger.error(`Failed to delete cooldown for ${provider}`, e);
                }
            }
        } else {
            this.cooldowns.clear();
            logger.info("Manually cleared all cooldowns");
            if (this.storage) {
                try {
                    this.storage.getDb().run("DELETE FROM provider_cooldowns");
                } catch (e) {
                    logger.error("Failed to delete all cooldowns", e);
                }
            }
        }
    }
}
