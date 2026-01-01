import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { UsageStorageService } from "../usage-storage";
import { UsageRecord } from "../../types/usage";

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

describe("UsageStorageService", () => {
    let service: UsageStorageService;

    beforeEach(() => {
        // Use in-memory database for testing
        service = new UsageStorageService(":memory:");
    });

    afterEach(() => {
        service.getDb().close();
    });

    test("should initialize database with correct schema", () => {
        const db = service.getDb();
        const query = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='request_usage';");
        const result = query.get();
        expect(result).not.toBeNull();
        expect(result).toEqual({ name: "request_usage" });
    });

    test("should save a usage record", () => {
        const record: UsageRecord = {
            requestId: "test-request-id",
            date: new Date().toISOString(),
            sourceIp: "127.0.0.1",
            apiKey: "sk-test",
            incomingApiType: "openai",
            provider: "openai",
            incomingModelAlias: "gpt-4",
            selectedModelName: "gpt-4-0613",
            outgoingApiType: "openai",
            tokensInput: 10,
            tokensOutput: 20,
            tokensReasoning: 5,
            tokensCached: 2,
            startTime: Date.now(),
            durationMs: 150,
            isStreamed: false,
            responseStatus: "success"
        };

        service.saveRequest(record);

        const db = service.getDb();
        const query = db.query("SELECT * FROM request_usage WHERE request_id = $requestId");
        const saved = query.get({ $requestId: "test-request-id" }) as any;

        expect(saved).not.toBeNull();
        expect(saved.request_id).toBe(record.requestId);
        expect(saved.source_ip).toBe(record.sourceIp);
        expect(saved.tokens_input).toBe(record.tokensInput);
        expect(saved.tokens_output).toBe(record.tokensOutput);
        expect(saved.is_streamed).toBe(0);
        expect(saved.response_status).toBe("success");
    });

    test("should handle null values correctly", () => {
        const record: UsageRecord = {
            requestId: "test-nulls",
            date: new Date().toISOString(),
            sourceIp: null,
            apiKey: null,
            incomingApiType: "anthropic",
            provider: null,
            incomingModelAlias: null,
            selectedModelName: null,
            outgoingApiType: null,
            tokensInput: null,
            tokensOutput: null,
            tokensReasoning: null,
            tokensCached: null,
            startTime: Date.now(),
            durationMs: 100,
            isStreamed: true,
            responseStatus: "error"
        };

        service.saveRequest(record);

        const db = service.getDb();
        const query = db.query("SELECT * FROM request_usage WHERE request_id = $requestId");
        const saved = query.get({ $requestId: "test-nulls" }) as any;

        expect(saved).not.toBeNull();
        expect(saved.source_ip).toBeNull();
        expect(saved.tokens_input).toBeNull();
        expect(saved.is_streamed).toBe(1);
    });
});
