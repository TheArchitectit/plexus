import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { UsageStorageService } from "../usage-storage";

// Mock Logger to suppress output
mock.module("../../utils/logger", () => ({
    logger: {
        info: mock(),
        error: mock(),
        warn: mock(),
        debug: mock(),
        silly: mock(),
    }
}));

describe("UsageStorageService - Performance Metrics", () => {
    let service: UsageStorageService;

    beforeEach(() => {
        service = new UsageStorageService(":memory:");
    });

    afterEach(() => {
        service.getDb().close();
    });

    test("should calculate tokens per second correctly based on output tokens", () => {
        const provider = "test-provider";
        const model = "test-model";
        const requestId = "req-1";
        const outputTokens = 100;
        const durationMs = 2000; // 2 seconds

        // Expected calculation: (100 / 2000) * 1000 = 50 tokens/sec
        
        service.updatePerformanceMetrics(
            provider,
            model,
            100, // TTFT
            outputTokens,
            durationMs,
            requestId
        );

        const db = service.getDb();
        const result = db.query("SELECT * FROM provider_performance WHERE request_id = $requestId").get({ $requestId: requestId }) as any;

        expect(result).not.toBeNull();
        expect(result.tokens_per_sec).toBe(50);
        expect(result.total_tokens).toBe(100); // Should store output tokens in total_tokens column
    });

    test("should handle null output tokens", () => {
        const provider = "test-provider";
        const model = "test-model";
        const requestId = "req-2";
        const outputTokens = null;
        const durationMs = 2000;

        service.updatePerformanceMetrics(
            provider,
            model,
            100,
            outputTokens,
            durationMs,
            requestId
        );

        const db = service.getDb();
        const result = db.query("SELECT * FROM provider_performance WHERE request_id = $requestId").get({ $requestId: requestId }) as any;

        expect(result).not.toBeNull();
        expect(result.tokens_per_sec).toBeNull();
        expect(result.total_tokens).toBeNull();
    });

    test("should limit stored metrics to 10 entries per provider/model", () => {
        const provider = "test-provider";
        const model = "test-model";

        // Insert 15 records
        for (let i = 0; i < 15; i++) {
            service.updatePerformanceMetrics(
                provider,
                model,
                100,
                10,
                1000,
                `req-${i}`
            );
            // Small delay to ensure created_at differs slightly if needed, 
            // though synchronous execution should be fine with Date.now() if fast enough? 
            // The code uses Date.now(), so let's hope they don't all land on same ms or order is stable.
            // SQLite INSERT order usually prevails for equal timestamps if ID is autoincrement.
        }

        const db = service.getDb();
        const count = db.query("SELECT COUNT(*) as count FROM provider_performance WHERE provider = $provider AND model = $model").get({ $provider: provider, $model: model }) as any;
        
        expect(count.count).toBe(10);
    });
});
