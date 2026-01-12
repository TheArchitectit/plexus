import { describe, test, expect } from "bun:test";
import { handleHealth, handleReady } from "../src/routes/health";

describe("Health Endpoints", () => {
  describe("GET /health", () => {
    test("returns 200 with status ok", async () => {
      const req = new Request("http://localhost:4000/health");
      const response = handleHealth(req);

      expect(response.status).toBe(200);

      const body = await response.json() as { status: string; version: string; timestamp: string };
      expect(body.status).toBe("ok");
      expect(body.version).toBe("0.1.0");
      expect(body.timestamp).toBeDefined();
    });

    test("timestamp is valid ISO 8601 format", async () => {
      const req = new Request("http://localhost:4000/health");
      const response = handleHealth(req);

      const body = await response.json() as { timestamp: string };
      const timestamp = new Date(body.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test("response content-type is application/json", () => {
      const req = new Request("http://localhost:4000/health");
      const response = handleHealth(req);

      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("application/json");
    });
  });

  describe("GET /ready", () => {
    test("returns 200 with ready true", async () => {
      const req = new Request("http://localhost:4000/ready");
      const response = handleReady(req);

      expect(response.status).toBe(200);

      const body = await response.json() as { ready: boolean };
      expect(body.ready).toBe(true);
    });

    test("response content-type is application/json", () => {
      const req = new Request("http://localhost:4000/ready");
      const response = handleReady(req);

      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("application/json");
    });
  });
});
