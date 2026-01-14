import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { UsageLogger, type RequestContext, type ResponseInfo } from "./usage-logger";
import { UsageStore } from "../storage/usage-store";
import { ErrorStore } from "../storage/error-store";
import { CostCalculator } from "./cost-calculator";
import { MetricsCollector } from "./metrics-collector";

describe("UsageLogger", () => {
  let usageLogger: UsageLogger;
  let mockUsageStore: any;
  let mockErrorStore: any;
  let mockCostCalculator: any;
  let mockMetricsCollector: any;
  let usageLogSpy: any;
  let errorLogSpy: any;
  let calculateCostSpy: any;
  let recordRequestSpy: any;

  beforeEach(() => {
    // Create mock stores with complete interface
    mockUsageStore = {
      log: async () => {},
      initialize: async () => {},
      query: async () => [],
      getSummary: async () => ({} as any),
      getById: async () => null,
      updateUsageWithMetrics: async () => false,
      cleanup: async () => {},
    };
    usageLogSpy = spyOn(mockUsageStore, "log");

    mockErrorStore = {
      log: async () => {},
      initialize: async () => {},
      query: async () => [],
      cleanup: async () => {},
    };
    errorLogSpy = spyOn(mockErrorStore, "log");

    // Create mock cost calculator with complete interface
    mockCostCalculator = {
      calculateCost: async () => ({
        inputCost: 0.001,
        outputCost: 0.002,
        cachedCost: 0.0001,
        reasoningCost: 0,
        totalCost: 0.0031,
        source: "config" as const,
        discount: 1.0,
      }),
      getEstimatedCostPer1M: async () => 1.0,
    updateConfig: () => {},
    };
    calculateCostSpy = spyOn(mockCostCalculator, "calculateCost");

    // Create mock metrics collector with complete interface
    mockMetricsCollector = {
      recordRequest: () => {},
      getProviderMetrics: () => null,
      getProviderLatency: () => null,
      getProviderCost: () => null,
      getProviderPerformance: () => null,
      getAllMetrics: () => new Map(),
      clear: () => {},
    };
    recordRequestSpy = spyOn(mockMetricsCollector, "recordRequest");

    usageLogger = new UsageLogger(
      mockUsageStore,
      mockErrorStore,
      mockCostCalculator,
      mockMetricsCollector,
      true
    );
  });

  describe("logRequest - successful request", () => {
    test("logs successful non-streaming request", async () => {
      const context: RequestContext = {
        id: "req-123",
        startTime: Date.now() - 1000, // 1 second ago
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
        aliasUsed: "fast",
        actualProvider: "openai",
        actualModel: "gpt-4o-mini",
        targetApiType: "chat",
        passthrough: false,
        streaming: false,
      };

      const responseInfo: ResponseInfo = {
        success: true,
        streaming: false,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 10,
          cacheCreationTokens: 0,
          reasoningTokens: 0,
        },
      };

      await usageLogger.logRequest(context, responseInfo);

       expect(usageLogSpy).toHaveBeenCalled();
       expect(calculateCostSpy).toHaveBeenCalledWith({
         model: "gpt-4o-mini",
      provider: "openai",
         inputTokens: 100,
         outputTokens: 50,
      cachedTokens: 10,
         reasoningTokens: 0,
       });
       expect(recordRequestSpy).toHaveBeenCalled();
    });

    test("logs successful streaming request with TTFT", async () => {
      const startTime = Date.now() - 2000;
      const context: RequestContext = {
        id: "req-456",
        startTime,
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
        aliasUsed: "fast",
        actualProvider: "openai",
        actualModel: "gpt-4o-mini",
        targetApiType: "chat",
        passthrough: false,
        streaming: true,
        providerFirstTokenTime: startTime + 500, // First token after 500ms
      };

      const responseInfo: ResponseInfo = {
        success: true,
        streaming: true,
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          reasoningTokens: 0,
        },
      };

      await usageLogger.logRequest(context, responseInfo);

      expect(usageLogSpy).toHaveBeenCalled();
      const loggedEntry = usageLogSpy.mock.calls[0][0];
      expect(loggedEntry.metrics.providerTtftMs).toBeCloseTo(500, 0);
      expect(loggedEntry.metrics.providerTokensPerSecond).toBeGreaterThan(0);
    });

    test("calculates cost per 1M tokens correctly", async () => {
      const context: RequestContext = {
        id: "req-789",
        startTime: Date.now() - 1000,
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
        aliasUsed: "fast",
        actualProvider: "openai",
        actualModel: "gpt-4o",
        targetApiType: "chat",
        passthrough: false,
        streaming: false,
      };

      const responseInfo: ResponseInfo = {
        success: true,
        streaming: false,
        usage: {
          inputTokens: 1000,
          outputTokens: 500,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          reasoningTokens: 0,
        },
      };

      await usageLogger.logRequest(context, responseInfo);

      expect(recordRequestSpy).toHaveBeenCalled();
      const metricsCall = recordRequestSpy.mock.calls[0][0];
      // Total cost 0.0031, total tokens 1500
      // costPer1M = (0.0031 / 1500) * 1,000,000
      expect(metricsCall.costPer1M).toBeCloseTo(2.0667, 2);
    });
  });

  describe("logRequest - failed request", () => {
    test("logs failed request to error store", async () => {
      const context: RequestContext = {
        id: "req-error",
        startTime: Date.now() - 1000,
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
        aliasUsed: "fast",
        actualProvider: "openai",
        actualModel: "gpt-4o",
        targetApiType: "chat",
        passthrough: false,
      };

      const responseInfo: ResponseInfo = {
        success: false,
        streaming: false,
        errorType: "rate_limit_error",
        errorMessage: "Rate limit exceeded",
        httpStatus: 429,
      };

      await usageLogger.logRequest(context, responseInfo);

      expect(errorLogSpy).toHaveBeenCalled();
      const errorEntry = errorLogSpy.mock.calls[0][0];
      expect(errorEntry.errorType).toBe("rate_limit_error");
      expect(errorEntry.errorMessage).toBe("Rate limit exceeded");
      expect(errorEntry.httpStatus).toBe(429);
    });

    test("records failed request metrics", async () => {
      const context: RequestContext = {
        id: "req-error2",
        startTime: Date.now() - 1000,
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
        aliasUsed: "fast",
        actualProvider: "openai",
        actualModel: "gpt-4o",
        targetApiType: "chat",
        passthrough: false,
      };

      const responseInfo: ResponseInfo = {
        success: false,
        streaming: false,
        errorType: "api_error",
        errorMessage: "Internal error",
      };

      await usageLogger.logRequest(context, responseInfo);

      expect(recordRequestSpy).toHaveBeenCalled();
      const metricsCall = recordRequestSpy.mock.calls[0][0];
      expect(metricsCall.success).toBe(false);
    });
  });

  describe("markFirstToken", () => {
    test("sets provider first token time only once", () => {
    const context: RequestContext = {
      id: "req-stream",
        startTime: Date.now(),
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
      clientApiType: "chat",
      };

      usageLogger.markFirstToken(context, "provider");
      const firstTokenTime = context.providerFirstTokenTime;

      // Wait a bit
      setTimeout(() => {}, 10);

      usageLogger.markFirstToken(context, "provider");
      expect(context.providerFirstTokenTime).toBe(firstTokenTime);
    });

    test("sets client first token time only once", () => {
      const context: RequestContext = {
        id: "req-stream-2",
        startTime: Date.now(),
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
      };

      usageLogger.markFirstToken(context, "client");
      const firstTokenTime = context.clientFirstTokenTime;

      // Wait a bit
      setTimeout(() => {}, 10);

      usageLogger.markFirstToken(context, "client");
      expect(context.clientFirstTokenTime).toBe(firstTokenTime);
    });
  });

  describe("disabled logger", () => {
    test("does not log when disabled", async () => {
      const disabledLogger = new UsageLogger(
        mockUsageStore,
        mockErrorStore,
        mockCostCalculator,
        mockMetricsCollector,
        false
      );

      const context: RequestContext = {
        id: "req-disabled",
        startTime: Date.now(),
        clientIp: "127.0.0.1",
        apiKeyName: "test-key",
        clientApiType: "chat",
      };

      const responseInfo: ResponseInfo = {
        success: true,
        streaming: false,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      await disabledLogger.logRequest(context, responseInfo);

      expect(usageLogSpy).not.toHaveBeenCalled();
    });
  });
});
