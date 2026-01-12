import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { loadConfig } from "../src/config";
import { tmpdir } from "os";

describe("Configuration Loading", () => {
  let testConfigDir: string;
  let testConfigPath: string;

  beforeEach(() => {
    // Create a temporary directory for test configs
    testConfigDir = join(tmpdir(), `plexus-test-${Date.now()}`);
    mkdirSync(testConfigDir, { recursive: true });
    testConfigPath = join(testConfigDir, "plexus.yaml");
  });

  afterEach(() => {
    // Clean up test config file
    try {
      unlinkSync(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  test("Valid YAML loads successfully", () => {
    const validConfig = `
server:
  port: 4000
  host: "0.0.0.0"

logging:
  level: "info"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, validConfig);

    const config = loadConfig(testConfigPath);

    expect(config.server.port).toBe(4000);
    expect(config.server.host).toBe("0.0.0.0");
    expect(config.logging.level).toBe("info");
    expect(config.providers).toEqual([]);
    expect(config.models).toEqual([]);
    expect(config.apiKeys).toEqual([]);
  });

  test("Missing file throws error with path", () => {
    const nonExistentPath = join(testConfigDir, "does-not-exist.yaml");

    expect(() => loadConfig(nonExistentPath)).toThrow(
      `Configuration file not found: ${nonExistentPath}`
    );
  });

  test("Invalid YAML syntax throws parse error", () => {
    const invalidYaml = `
server:
  port: 4000
  host: "0.0.0.0
  # Missing closing quote above
`;
    writeFileSync(testConfigPath, invalidYaml);

    expect(() => loadConfig(testConfigPath)).toThrow("Failed to load configuration");
  });

  test("Schema violation throws Zod validation error", () => {
    const invalidSchema = `
server:
  port: "not-a-number"
  host: "0.0.0.0"

logging:
  level: "info"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, invalidSchema);

    expect(() => loadConfig(testConfigPath)).toThrow("Failed to load configuration");
  });

  test("Missing required field throws validation error", () => {
    const missingField = `
server:
  host: "0.0.0.0"
  # port is missing

logging:
  level: "info"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, missingField);

    expect(() => loadConfig(testConfigPath)).toThrow("Failed to load configuration");
  });

  test("Environment variable PLEXUS_PORT overrides config", () => {
    const validConfig = `
server:
  port: 4000
  host: "0.0.0.0"

logging:
  level: "info"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, validConfig);

    // Set environment variable
    process.env.PLEXUS_PORT = "5000";

    const config = loadConfig(testConfigPath);

    expect(config.server.port).toBe(5000);

    // Clean up
    delete process.env.PLEXUS_PORT;
  });

  test("Environment variable PLEXUS_LOG_LEVEL overrides config", () => {
    const validConfig = `
server:
  port: 4000
  host: "0.0.0.0"

logging:
  level: "info"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, validConfig);

    // Set environment variable
    process.env.PLEXUS_LOG_LEVEL = "debug";

    const config = loadConfig(testConfigPath);

    expect(config.logging.level).toBe("debug");

    // Clean up
    delete process.env.PLEXUS_LOG_LEVEL;
  });

  test("Empty file throws error", () => {
    writeFileSync(testConfigPath, "");

    expect(() => loadConfig(testConfigPath)).toThrow("Configuration file is empty");
  });

  test("Invalid log level throws validation error", () => {
    const invalidLogLevel = `
server:
  port: 4000
  host: "0.0.0.0"

logging:
  level: "invalid-level"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, invalidLogLevel);

    expect(() => loadConfig(testConfigPath)).toThrow("Failed to load configuration");
  });

  test("Port out of range throws validation error", () => {
    const invalidPort = `
server:
  port: 99999
  host: "0.0.0.0"

logging:
  level: "info"

providers: []
models: []
apiKeys: []
`;
    writeFileSync(testConfigPath, invalidPort);

    expect(() => loadConfig(testConfigPath)).toThrow("Failed to load configuration");
  });
});
