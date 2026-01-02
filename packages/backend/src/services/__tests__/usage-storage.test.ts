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

function createUsageRecord(overrides: Partial<UsageRecord>): UsageRecord {
    return {
        requestId: "default-req",
        date: new Date().toISOString(),
        sourceIp: null,
        apiKey: null,
        incomingApiType: "chat",
        provider: null,
        incomingModelAlias: null,
        selectedModelName: null,
        outgoingApiType: null,
        tokensInput: 0,
        tokensOutput: 0,
        tokensReasoning: 0,
        tokensCached: 0,
        costInput: 0,
        costOutput: 0,
        costCached: 0,
        costTotal: 0,
        costSource: null,
        costMetadata: null,
        startTime: Date.now(),
        durationMs: 0,
        isStreamed: false,
        responseStatus: "success",
        isPassthrough: false,
        ...overrides
    };
}

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
        const record = createUsageRecord({
            requestId: "test-request-id",
            sourceIp: "127.0.0.1",
            apiKey: "sk-test",
            provider: "openai",
            incomingModelAlias: "gpt-4",
            selectedModelName: "gpt-4-0613",
            outgoingApiType: "chat",
            tokensInput: 10,
            tokensOutput: 20,
            tokensReasoning: 5,
            tokensCached: 2,
            durationMs: 150
        });

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
        const record = createUsageRecord({
            requestId: "test-nulls",
            sourceIp: null,
            apiKey: null,
            incomingApiType: "messages",
            provider: null,
            incomingModelAlias: null,
            selectedModelName: null,
            outgoingApiType: null,
            tokensInput: null,
            tokensOutput: null,
            tokensReasoning: null,
            tokensCached: null,
            durationMs: 100,
            isStreamed: true,
            responseStatus: "error"
        });

        service.saveRequest(record);

        const db = service.getDb();
        const query = db.query("SELECT * FROM request_usage WHERE request_id = $requestId");
        const saved = query.get({ $requestId: "test-nulls" }) as any;

        expect(saved).not.toBeNull();
        expect(saved.source_ip).toBeNull();
        expect(saved.tokens_input).toBeNull();
        expect(saved.is_streamed).toBe(1);
    });

    test("should retrieve usage with pagination", () => {
        const baseRecord = createUsageRecord({
            sourceIp: "127.0.0.1",
            apiKey: "sk-test",
            provider: "openai",
            incomingModelAlias: "gpt-4",
            selectedModelName: "gpt-4-0613",
            outgoingApiType: "chat",
            tokensInput: 10,
            tokensOutput: 20,
            durationMs: 150
        });

        for (let i = 0; i < 5; i++) {
            service.saveRequest({ ...baseRecord, requestId: `req-${i}`, date: new Date(Date.now() - i * 1000).toISOString() });
        }

        const result = service.getUsage({}, { limit: 2, offset: 0 });
        expect(result.total).toBe(5);
        expect(result.data.length).toBe(2);
        // Ordered by date DESC, so req-0 (newest) first
        expect(result.data[0]!.requestId).toBe("req-0");
        expect(result.data[1]!.requestId).toBe("req-1");

        const result2 = service.getUsage({}, { limit: 2, offset: 2 });
        expect(result2.data.length).toBe(2);
        expect(result2.data[0]!.requestId).toBe("req-2");
    });

    test("should filter usage with partial text match (LIKE)", () => {
        const record1 = createUsageRecord({
            requestId: "req-1",
            sourceIp: "127.0.0.1",
            apiKey: "key",
            provider: "openai-production",
            incomingModelAlias: "gpt-4-turbo",
            selectedModelName: "gpt-4-0613",
            outgoingApiType: "chat",
            tokensInput: 10,
            tokensOutput: 20,
            durationMs: 100
        });
        const record2 = createUsageRecord({
            ...record1,
            requestId: "req-2",
            provider: "anthropic-claude",
            incomingModelAlias: "claude-3-opus",
            selectedModelName: "claude-3-opus-20240229"
        });

        service.saveRequest(record1);
        service.saveRequest(record2);

        // Filter by partial provider
        const resProvider = service.getUsage({ provider: "openai" }, { limit: 10, offset: 0 });
        expect(resProvider.total).toBe(1);
        expect(resProvider.data[0]!.requestId).toBe("req-1");

        // Filter by partial model alias
        const resModel = service.getUsage({ incomingModelAlias: "claude" }, { limit: 10, offset: 0 });
        expect(resModel.total).toBe(1);
        expect(resModel.data[0]!.requestId).toBe("req-2");
        
        // Filter by partial selected model
        const resSelected = service.getUsage({ selectedModelName: "0613" }, { limit: 10, offset: 0 });
        expect(resSelected.total).toBe(1);
        expect(resSelected.data[0]!.requestId).toBe("req-1");
    });

    test("should delete a usage log", () => {
        service.saveRequest(createUsageRecord({
            requestId: "del-req-1",
            durationMs: 100, responseStatus: "success"
        }));

        expect(service.getUsage({}, { limit: 10, offset: 0 }).total).toBeGreaterThan(0);

        const success = service.deleteUsageLog("del-req-1");
        expect(success).toBe(true);
        
        const success2 = service.deleteUsageLog("del-req-1");
        expect(success2).toBe(false);
    });

    test("should delete all usage logs", () => {
        service.saveRequest(createUsageRecord({ requestId: "u-1" }));
        service.saveRequest(createUsageRecord({ requestId: "u-2" }));
        
        expect(service.getUsage({}, { limit: 10, offset: 0 }).total).toBeGreaterThanOrEqual(2);

        const success = service.deleteAllUsageLogs();
        expect(success).toBe(true);

        expect(service.getUsage({}, { limit: 10, offset: 0 }).total).toBe(0);
    });

    test("should delete usage logs older than specified date", () => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Log from 5 days ago
        service.saveRequest(createUsageRecord({ 
            requestId: "old-req", 
            date: new Date(now - 5 * oneDay).toISOString() 
        }));
        
        // Log from 1 day ago
        service.saveRequest(createUsageRecord({ 
            requestId: "new-req", 
            date: new Date(now - 1 * oneDay).toISOString() 
        }));

        // Delete logs older than 3 days ago
        const cutoffDate = new Date(now - 3 * oneDay);
        service.deleteAllUsageLogs(cutoffDate);

        const logs = service.getUsage({}, { limit: 10, offset: 0 });
        expect(logs.total).toBe(1);
        expect(logs.data[0]!.requestId).toBe("new-req");
    });

    test("should populate hasDebug flag", () => {
        service.saveRequest(createUsageRecord({ requestId: "req-with-debug" }));
        service.saveDebugLog({
            requestId: "req-with-debug",
            createdAt: Date.now()
        });

        service.saveRequest(createUsageRecord({ requestId: "req-no-debug" }));

        const result = service.getUsage({}, { limit: 10, offset: 0 });
        const withDebug = result.data.find(r => r.requestId === "req-with-debug");
        const noDebug = result.data.find(r => r.requestId === "req-no-debug");

        expect(withDebug?.hasDebug).toBe(true);
        expect(noDebug?.hasDebug).toBe(false);
    });

    test("should delete a debug log", () => {
        const logRecord = {
            requestId: "debug-req-1",
            createdAt: Date.now(),
            rawRequest: "{}",
            transformedRequest: "{}",
            rawResponse: "{}",
            transformedResponse: "{}"
        };

        service.saveDebugLog(logRecord);

        // Verify it exists
        const savedLog = service.getDebugLog("debug-req-1");
        expect(savedLog).not.toBeNull();

        // Delete it
        const deleted = service.deleteDebugLog("debug-req-1");
        expect(deleted).toBe(true);

        // Verify it's gone
        const deletedLog = service.getDebugLog("debug-req-1");
        expect(deletedLog).toBeNull();
    });

    test("should return false when deleting non-existent debug log", () => {
        const deleted = service.deleteDebugLog("non-existent-id");
        expect(deleted).toBe(false);
    });

    test('should delete all debug logs', () => {
        const record = {
            requestId: 'req-delete-all',
            rawRequest: { prompt: 'test' },
            createdAt: Date.now()
        };
        
        service.saveDebugLog(record);
        service.saveDebugLog({ ...record, requestId: 'req-delete-all-2' });
        
        const success = service.deleteAllDebugLogs();
        expect(success).toBe(true);
        
        const logs = service.getDebugLogs();
        expect(logs.length).toBe(0);
    });

    test('should save and retrieve an inference error', () => {
        const error = new Error("Test Error Message");
        error.stack = "Error: Test Error Message\n    at Test.function";
        
        service.saveError('req-error-1', error, { extra: 'detail' });
        
        const errors = service.getErrors();
        expect(errors.length).toBe(1);
        expect(errors[0].request_id).toBe('req-error-1');
        expect(errors[0].error_message).toBe("Test Error Message");
        expect(errors[0].error_stack).toContain("Test.function");
        expect(errors[0].details).toContain('{"extra":"detail"}');
    });

    test('should delete a specific inference error', () => {
        service.saveError('req-error-1', new Error("Error 1"));
        service.saveError('req-error-2', new Error("Error 2"));
        
        const result = service.deleteError('req-error-1');
        expect(result).toBe(true);
        
        const errors = service.getErrors();
        expect(errors.length).toBe(1);
        expect(errors[0].request_id).toBe('req-error-2');
    });

    test('should delete all inference errors', () => {
        service.saveError('req-error-1', new Error("Error 1"));
        service.saveError('req-error-2', new Error("Error 2"));
        
        const result = service.deleteAllErrors();
        expect(result).toBe(true);
        
        const errors = service.getErrors();
        expect(errors.length).toBe(0);
    });
});