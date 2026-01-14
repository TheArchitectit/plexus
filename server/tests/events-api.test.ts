import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { handleEvents } from "../routes/v0/events";
import { EventEmitter } from "../services/event-emitter";

describe("Events API", () => {
  let eventEmitter: EventEmitter;
  let server: any;
  let baseUrl: string;

  beforeAll(() => {
    eventEmitter = new EventEmitter(10, 100); // Fast heartbeat for test
    
    // Start a real server for testing streaming
    server = Bun.serve({
      port: 0, // Random port
      fetch: (req) => {
        const url = new URL(req.url);
        if (url.pathname === "/v0/events") {
          return handleEvents(req, eventEmitter);
        }
        return new Response("Not Found", { status: 404 });
      }
    });
    
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
    eventEmitter.shutdown();
  });

  test("GET /v0/events receives heartbeat", async () => {
    const res = await fetch(`${baseUrl}/v0/events`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    
    const reader = res.body?.getReader();
    expect(reader).toBeDefined();
    
    const { value, done } = await reader!.read();
    
    expect(done).toBe(false);
    const text = new TextDecoder().decode(value);
    expect(text).toContain("event: heartbeat");
    
    await reader!.cancel();
  });

  test("GET /v0/events receives emitted events", async () => {
    const res = await fetch(`${baseUrl}/v0/events`);
    const reader = res.body?.getReader();
    
    // Read initial heartbeat
    await reader!.read();

    // Emit an event
    const testEvent = { id: "test-1" };
    eventEmitter.emitEvent("usage", testEvent);

    // Read next chunk
    const { value, done } = await reader!.read();
    
    expect(done).toBe(false);
    const text = new TextDecoder().decode(value);
    expect(text).toContain("event: usage");
    
    await reader!.cancel();
  });
});
