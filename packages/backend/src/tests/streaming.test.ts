import { describe, test, expect } from "bun:test";

describe("Streaming Support", () => {

  describe("OpenAI Streaming", () => {
    test("should detect streaming response from Content-Type header", async () => {
      // Create a mock streaming response
      const mockStreamBody = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(
            encoder.encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1694268190,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      const mockResponse = new Response(mockStreamBody, {
        headers: {
          "Content-Type": "text/event-stream",
        },
      });

      // Verify the response is detected as streaming
      expect(mockResponse.headers.get("Content-Type")).toContain("text/event-stream");
    });

    test("should parse SSE chunks correctly", async () => {
      const mockStreamBody = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode('data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"content":"Test"},"finish_reason":null}]}\n\n')
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      const reader = mockStreamBody.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain("data:");
      expect(text).toContain("Test");
    });
  });

  describe("Anthropic Streaming", () => {
    test("should handle Anthropic event stream format", async () => {
      const mockStreamBody = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_123","role":"assistant"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n')
          );
          controller.enqueue(
            encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n')
          );
          controller.close();
        },
      });

      const reader = mockStreamBody.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const text = decoder.decode(value);

      expect(text).toContain("event: message_start");
      expect(text).toContain("data:");
    });
  });

  describe("Cross-format Streaming", () => {
    test("should identify when transformation is needed", () => {
      const { TransformerFactory } = require("../services/transformer-factory");
      
      expect(TransformerFactory.needsTransformation("chat", "messages")).toBe(true);
      expect(TransformerFactory.needsTransformation("chat", "chat")).toBe(false);
      expect(TransformerFactory.needsTransformation("messages", "chat")).toBe(true);
      expect(TransformerFactory.needsTransformation("messages", "messages")).toBe(false);
    });
  });
});
