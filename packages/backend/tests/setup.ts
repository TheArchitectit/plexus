import { mock } from "bun:test";

/**
 * Global test setup
 * Mocks logger to prevent console noise during tests
 * 
 * IMPORTANT: This mock MUST implement the entire Logger interface
 * to prevent crashes in other tests (per AGENTS.md Section 6.1)
 */
mock.module("../src/utils/logger", () => ({
  logger: {
    configure: () => {},
    setContext: () => {},
    child: () => ({
      silly: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    }),
    silly: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
}));
