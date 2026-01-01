import { expect, test, describe, beforeEach } from "bun:test";
import { CooldownManager } from "../cooldown-manager";
import { UsageStorageService } from "../usage-storage";

describe("CooldownManager Persistence", () => {
    let storage: UsageStorageService;
    let manager: CooldownManager;

    beforeEach(async () => {
        // Use in-memory DB for tests
        storage = new UsageStorageService(":memory:");
        manager = CooldownManager.getInstance();
        await manager.setStorage(storage);
    });

    test("persists cooldown failure to database", () => {
        const provider = "test-provider-persist";
        manager.markProviderFailure(provider);

        const db = storage.getDb();
        const row = db.query("SELECT * FROM provider_cooldowns WHERE provider = ?").get(provider) as any;
        
        expect(row).toBeDefined();
        expect(row.provider).toBe(provider);
        expect(row.expiry).toBeGreaterThan(Date.now());
    });

    test("loads cooldowns from database on init", async () => {
        const provider = "test-provider-load";
        const futureExpiry = Date.now() + 60000;
        
        // Manually insert into DB
        storage.getDb().run(
            "INSERT INTO provider_cooldowns (provider, expiry, created_at) VALUES (?, ?, ?)",
            [provider, futureExpiry, Date.now()]
        );

        // Re-init manager to simulate restart
        await manager.setStorage(storage);
        
        expect(manager.isProviderHealthy(provider)).toBe(false);
    });

    test("cleans up expired cooldowns from database", async () => {
        const provider = "test-provider-expired";
        const pastExpiry = Date.now() - 1000;

        // Manually insert expired record
        storage.getDb().run(
            "INSERT INTO provider_cooldowns (provider, expiry, created_at) VALUES (?, ?, ?)",
            [provider, pastExpiry, Date.now()]
        );

        // Re-init manager should clean it up
        await manager.setStorage(storage);

        const row = storage.getDb().query("SELECT * FROM provider_cooldowns WHERE provider = ?").get(provider);
        expect(row).toBeNull();
        expect(manager.isProviderHealthy(provider)).toBe(true);
    });

    test("getCooldowns returns active cooldowns", () => {
        const provider1 = "p1-active";
        manager.markProviderFailure(provider1);
        
        const cooldowns = manager.getCooldowns();
        expect(cooldowns.length).toBeGreaterThanOrEqual(1);
        const entry = cooldowns.find(c => c.provider === provider1);
        expect(entry).toBeDefined();
        expect(entry?.timeRemainingMs).toBeGreaterThan(0);
    });
});
