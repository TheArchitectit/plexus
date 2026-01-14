import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "path";
import { loadConfig } from "../config";
import { tmpdir } from "os";

describe("Configuration Loading", () => {
  let testConfigDir: string;
  let testConfigPath: string;

  beforeEach(async () => {
    // Create a temporary directory for test configs
    testConfigDir = join(tmpdir(), `plexus-test-${Date.now()}`);
    await mkdir(testConfigDir, { recursive: true });
    testConfigPath = join(testConfigDir, "plexus.yaml");
  });

  afterEach(async () => {
    // Clean up test config file
    try {
      await unlink(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  test("Valid YAML loads successfully", async () => {
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
    await Bun.write(testConfigPath, validConfig);

    const config = await loadConfig(testConfigPath);

    expect(config.server.port).toBe(4000);
    expect(config.server.host).toBe("0.0.0.0");
    expect(config.logging.level).toBe("info");
    expect(config.providers).toEqual([]);
    expect(config.models).toEqual([]);
    expect(config.apiKeys).toEqual([]);
  });

  test("Missing file throws error with path", async () => {
    const nonExistentPath = join(testConfigDir, "does-not-exist.yaml");

    expect(loadConfig(nonExistentPath)).rejects.toThrow(
      `Configuration file not found: ${nonExistentPath}`
    );
  });

  test("Invalid YAML syntax throws parse error", async () => {
    const invalidYaml = `
server:
  port: 4000
  host: "0.0.0.0
  # Missing closing quote above
`;
    await Bun.write(testConfigPath, invalidYaml);

    expect(loadConfig(testConfigPath)).rejects.toThrow("Failed to load configuration");
  });

  test("Schema violation throws Zod validation error", async () => {
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
    await Bun.write(testConfigPath, invalidSchema);

    expect(loadConfig(testConfigPath)).rejects.toThrow("Failed to load configuration");
  });

  test("Missing required field throws validation error", async () => {
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
    await Bun.write(testConfigPath, missingField);

    expect(loadConfig(testConfigPath)).rejects.toThrow("Failed to load configuration");
  });

  test("Environment variable PLEXUS_PORT overrides config", async () => {
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
    await Bun.write(testConfigPath, validConfig);

    // Set environment variable
    process.env.PLEXUS_PORT = "5000";

    const config = await loadConfig(testConfigPath);

    expect(config.server.port).toBe(5000);

    // Clean up
    delete process.env.PLEXUS_PORT;
  });

  test("Environment variable PLEXUS_LOG_LEVEL overrides config", async () => {
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
    await Bun.write(testConfigPath, validConfig);

    // Set environment variable
    process.env.PLEXUS_LOG_LEVEL = "debug";

    const config = await loadConfig(testConfigPath);

    expect(config.logging.level).toBe("debug");

    // Clean up
    delete process.env.PLEXUS_LOG_LEVEL;
  });

  test("Empty file throws error", async () => {
    await Bun.write(testConfigPath, "");

    expect(loadConfig(testConfigPath)).rejects.toThrow("Configuration file is empty");
  });

  test("Invalid log level throws validation error", async () => {
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
    await Bun.write(testConfigPath, invalidLogLevel);

    expect(loadConfig(testConfigPath)).rejects.toThrow("Failed to load configuration");
  });

  test("Port out of range throws validation error", async () => {
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
    await Bun.write(testConfigPath, invalidPort);

    expect(loadConfig(testConfigPath)).rejects.toThrow("Failed to load configuration");
  });
});
