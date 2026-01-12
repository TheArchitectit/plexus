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

    // Write mock debug traces with different timestamps
    // We can't easily fake file creation time (birthtime/mtime) cross-platform reliably without hacks,
    // but we can rely on Bun.write updating mtime.
    // We'll write them sequentially with a small delay if needed, or just check they are listed.
    
    for (let i = 1; i <= 5; i++) {
        const entry = {
            id: `trace-${i}`,
            timestamp: new Date().toISOString(),
            clientRequest: { apiType: "chat" }
        };
        await Bun.write(join(TEST_LOG_DIR, "debug", `trace-${i}.json`), JSON.stringify(entry));
        // small sleep to ensure mtime diff if filesystem has low resolution (not strictly needed for "list" existence check)
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
