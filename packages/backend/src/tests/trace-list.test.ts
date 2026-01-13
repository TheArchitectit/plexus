import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { LogQueryService } from "../services/log-query";
import { UsageStore } from "../storage/usage-store";
import { ErrorStore } from "../storage/error-store";
import { DebugStore } from "../storage/debug-store";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

describe("Trace List Integration", () => {
  const TEST_LOG_DIR = "test-logs-trace-list";
  let logQueryService: LogQueryService;
  let debugStore: DebugStore;

  beforeAll(async () => {
    await mkdir(TEST_LOG_DIR, { recursive: true });
    await mkdir(join(TEST_LOG_DIR, "usage"), { recursive: true });
    await mkdir(join(TEST_LOG_DIR, "errors"), { recursive: true });
    await mkdir(join(TEST_LOG_DIR, "debug"), { recursive: true });

    const usageStore = new UsageStore(join(TEST_LOG_DIR, "usage"));
    const errorStore = new ErrorStore(join(TEST_LOG_DIR, "errors"));
    debugStore = new DebugStore(join(TEST_LOG_DIR, "debug"), 7);

    // Write mock debug traces using the store method to ensure correct structure
    for (let i = 1; i <= 5; i++) {
        const entry = {
            id: `trace-${i}`,
            timestamp: new Date().toISOString(),
            clientRequest: { 
                apiType: "chat" as any,
                body: { message: `test ${i}` },
                headers: {}
            },
            unifiedRequest: {},
            providerRequest: {
                apiType: "chat" as any,
                body: {},
                headers: {}
            }
        };
        await debugStore.store(entry);
        // small sleep to ensure mtime diff
        await new Promise(r => setTimeout(r, 10)); 
    }

    logQueryService = new LogQueryService(usageStore, errorStore, debugStore);
  });

  afterAll(async () => {
    await rm(TEST_LOG_DIR, { recursive: true, force: true });
  });

  test("queryLogs returns list of traces", async () => {
    const result = await logQueryService.queryLogs({ type: "trace", limit: 10 });
    
    expect(result.type).toBe("trace");
    expect(result.entries).toHaveLength(5);
    expect(result.entries[0]).toHaveProperty("id");
  });

  test("queryLogs respects pagination", async () => {
    const result = await logQueryService.queryLogs({ type: "trace", limit: 2 });
    expect(result.entries).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });
});
