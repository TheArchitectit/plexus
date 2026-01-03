import { describe, expect, test, mock, beforeEach } from "bun:test";
import { handleResponse } from "../response-handler";
import { Context } from "hono";
import { UsageStorageService } from "../../services/usage-storage";
import { Transformer } from "../../types/transformer";
import { UnifiedChatResponse } from "../../types/unified";
import { UsageRecord } from "../../types/usage";

// Mock Logger
mock.module("../logger", () => ({
    logger: {
        debug: mock(),
        error: mock(),
        warn: mock()
    }
}));

// Mock Hono Streaming
mock.module("hono/streaming", () => ({
    stream: (_c: any, cb: any) => ({ handler: cb })
}));

describe("Stream Abort Handling", () => {
    let mockStorage: any;
    let mockTransformer: any;
    let mockContext: any;

    beforeEach(() => {
        mockStorage = {
            saveRequest: mock(),
            saveError: mock(),
            updatePerformanceMetrics: mock()
        };

        mockTransformer = {
            name: "test-transformer",
            formatStream: mock((s: any) => s),
        };

        mockContext = {
            json: mock(),
            header: mock(),
        };
    });

    test("should handle stream.onAbort correctly", async () => {
        const stream = new ReadableStream({
            start(controller) {
                // Keep it open
            },
            cancel: mock(() => Promise.resolve())
        });

        const unifiedResponse: UnifiedChatResponse = {
            id: "resp-abort",
            model: "model-abort",
            stream: stream
        };

        const usageRecord: Partial<UsageRecord> = {
            requestId: "req-abort"
        };

        const res = await handleResponse(
            mockContext,
            unifiedResponse,
            mockTransformer,
            usageRecord,
            mockStorage as any,
            Date.now(),
            "chat"
        ) as any;

        const mockHonoStream = {
            write: mock(() => Promise.resolve()),
            close: mock(),
            onAbort: mock((cb: any) => {
                // Manually trigger the abort callback
                cb();
            })
        };

        // Trigger the handler
        const handlerPromise = res.handler(mockHonoStream);
        
        // Wait a bit for the abort to process
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(usageRecord.responseStatus).toBe("client_disconnect");
        expect(mockStorage.saveError).toHaveBeenCalled();
        const errorArgs = mockStorage.saveError.mock.calls[0];
        expect(errorArgs[2].phase).toBe('stream_transmission_client_abort');
    });
});
