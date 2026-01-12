import { describe, test, expect, beforeAll } from "bun:test";
import { handleState } from "../routes/v0/state";
import { CooldownManager } from "../services/cooldown-manager";
import { HealthMonitor } from "../services/health-monitor";
import type { ServerContext } from "../types/server";

describe("State API", () => {
  let context: ServerContext;

  beforeAll(() => {
    const mockConfig: any = {
      providers: [
        { name: "openai", enabled: true, models: ["gpt-4"] },
        { name: "anthropic", enabled: true, models: ["claude-3"] }
      ],
      logging: { debug: { enabled: false } },
      resilience: {
        cooldown: { defaults: {}, storagePath: "temp_cooldowns.json" },
        health: {}
      }
    };

    const cooldownManager = new CooldownManager(mockConfig);
    const healthMonitor = new HealthMonitor(mockConfig, cooldownManager);

    context = {
      config: mockConfig,
      cooldownManager,
      healthMonitor
    };
  });

  test("GET /v0/state returns system state", async () => {
    const req = new Request("http://localhost/v0/state", { method: "GET" });
    const res = await handleState(req, context);
    
    expect(res.status).toBe(200);
    const body = await res.json();
    
    expect(body.uptime).toBeDefined();
    expect(body.providers).toHaveLength(2);
    expect(body.providers[0].name).toBe("openai");
    expect(body.debug.enabled).toBe(false);
  });

  test("POST /v0/state set-debug action", async () => {
    const req = new Request("http://localhost/v0/state", {
      method: "POST",
      body: JSON.stringify({ 
        action: "set-debug", 
        payload: { enabled: true } 
      }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await handleState(req, context);
    expect(res.status).toBe(200);
    const body = await res.json();
    
    expect(body.success).toBe(true);
    expect(body.message).toContain("Debug mode set to true");
  });

  test("POST /v0/state unknown action", async () => {
    const req = new Request("http://localhost/v0/state", {
      method: "POST",
      body: JSON.stringify({ 
        action: "invalid-action", 
        payload: {} 
      }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await handleState(req, context);
    expect(res.status).toBe(400);
  });
});
