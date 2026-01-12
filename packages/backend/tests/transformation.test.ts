import { test, expect, describe } from "bun:test";
import { TransformerFactory, transformerFactory, ApiType } from "../src/services/transformer-factory";
import { AnthropicTransformer } from "../src/lib/llms-transformer/src/transformer/anthropic.transformer";
import { OpenAITransformer } from "../src/lib/llms-transformer/src/transformer/openai.transformer";

describe("TransformerFactory", () => {
  describe("getTransformer", () => {
    test("returns OpenAITransformer for chat API type", () => {
      const transformer = transformerFactory.getTransformer("chat");
      expect(transformer).toBeInstanceOf(OpenAITransformer);
      expect(transformer.name).toBe("OpenAI");
      expect(transformer.endPoint).toBe("/v1/chat/completions");
    });

    test("returns AnthropicTransformer for messages API type", () => {
      const transformer = transformerFactory.getTransformer("messages");
      expect(transformer).toBeInstanceOf(AnthropicTransformer);
      expect(transformer.name).toBe("Anthropic");
      expect(transformer.endPoint).toBe("/v1/messages");
    });

    test("throws for unknown API type", () => {
      expect(() => {
        transformerFactory.getTransformer("unknown" as ApiType);
      }).toThrow("No transformer found for API type: unknown");
    });
  });

  describe("detectApiType", () => {
    test("detects chat API type from path", () => {
      expect(TransformerFactory.detectApiType("/v1/chat/completions")).toBe("chat");
      expect(TransformerFactory.detectApiType("/api/v1/chat/completions")).toBe("chat");
    });

    test("detects messages API type from path", () => {
      expect(TransformerFactory.detectApiType("/v1/messages")).toBe("messages");
      expect(TransformerFactory.detectApiType("/api/v1/messages")).toBe("messages");
    });

    test("returns null for unknown path", () => {
      expect(TransformerFactory.detectApiType("/v1/unknown")).toBeNull();
      expect(TransformerFactory.detectApiType("/other/path")).toBeNull();
    });
  });

  describe("getProviderApiType", () => {
    test("returns messages if provider supports messages", () => {
      expect(TransformerFactory.getProviderApiType(["messages"])).toBe("messages");
      expect(TransformerFactory.getProviderApiType(["chat", "messages"])).toBe("messages");
    });

    test("returns chat as default", () => {
      expect(TransformerFactory.getProviderApiType(["chat"])).toBe("chat");
      expect(TransformerFactory.getProviderApiType([])).toBe("chat");
    });
  });

  describe("needsTransformation", () => {
    test("returns false when source and target are same", () => {
      expect(TransformerFactory.needsTransformation("chat", "chat")).toBe(false);
      expect(TransformerFactory.needsTransformation("messages", "messages")).toBe(false);
    });

    test("returns true when source and target differ", () => {
      expect(TransformerFactory.needsTransformation("chat", "messages")).toBe(true);
      expect(TransformerFactory.needsTransformation("messages", "chat")).toBe(true);
    });
  });
});

describe("Anthropic Transformer - transformRequestOut", () => {
  const anthropicTransformer = new AnthropicTransformer();

  test("converts basic Anthropic request to unified format", async () => {
    const anthropicRequest = {
      model: "claude-3-opus",
      max_tokens: 1000,
      messages: [
        { role: "user", content: "Hello" }
      ]
    };

    const unified = await anthropicTransformer.transformRequestOut!(anthropicRequest, {});

    expect(unified.model).toBe("claude-3-opus");
    expect(unified.max_tokens).toBe(1000);
    expect(unified.messages).toHaveLength(1);
    expect(unified.messages[0].role).toBe("user");
    expect(unified.messages[0].content).toBe("Hello");
  });

  test("converts Anthropic system message to unified format", async () => {
    const anthropicRequest = {
      model: "claude-3-opus",
      max_tokens: 1000,
      system: "You are a helpful assistant.",
      messages: [
        { role: "user", content: "Hello" }
      ]
    };

    const unified = await anthropicTransformer.transformRequestOut!(anthropicRequest, {});

    // System should be first message
    expect(unified.messages[0].role).toBe("system");
    expect(unified.messages[0].content).toBe("You are a helpful assistant.");
    expect(unified.messages[1].role).toBe("user");
    expect(unified.messages[1].content).toBe("Hello");
  });

  test("converts Anthropic tools to unified format", async () => {
    const anthropicRequest = {
      model: "claude-3-opus",
      max_tokens: 1000,
      messages: [
        { role: "user", content: "What's the weather?" }
      ],
      tools: [
        {
          name: "get_weather",
          description: "Get weather for a location",
          input_schema: {
            type: "object",
            properties: {
              location: { type: "string" }
            },
            required: ["location"]
          }
        }
      ]
    };

    const unified = await anthropicTransformer.transformRequestOut!(anthropicRequest, {});

    expect(unified.tools).toHaveLength(1);
    expect(unified.tools![0].type).toBe("function");
    expect(unified.tools![0].function.name).toBe("get_weather");
    expect(unified.tools![0].function.description).toBe("Get weather for a location");
  });

  test("handles assistant messages with content blocks", async () => {
    const anthropicRequest = {
      model: "claude-3-opus",
      max_tokens: 1000,
      messages: [
        { role: "user", content: "Hello" },
        { 
          role: "assistant", 
          content: [
            { type: "text", text: "Hi there!" }
          ]
        }
      ]
    };

    const unified = await anthropicTransformer.transformRequestOut!(anthropicRequest, {});

    expect(unified.messages[1].role).toBe("assistant");
    expect(unified.messages[1].content).toBe("Hi there!");
  });
});

describe("transformToUnified and transformFromUnified", () => {
  test("OpenAI request passes through unchanged (unified IS OpenAI format)", async () => {
    const openaiRequest = {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hello" }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };

    const context = { req: { id: "test" } };
    const unified = await transformerFactory.transformToUnified(openaiRequest, "chat", context);

    // Should be the same object (or equivalent)
    expect(unified.model).toBe("gpt-4");
    expect(unified.messages).toHaveLength(2);
    expect(unified.max_tokens).toBe(1000);
    expect(unified.temperature).toBe(0.7);
  });

  test("Anthropic request is transformed to unified format", async () => {
    const anthropicRequest = {
      model: "claude-3-opus",
      system: "You are helpful.",
      messages: [
        { role: "user", content: "Hello" }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };

    const context = { req: { id: "test" } };
    const unified = await transformerFactory.transformToUnified(anthropicRequest, "messages", context);

    expect(unified.model).toBe("claude-3-opus");
    // System message should be converted to a message in unified format
    expect(unified.messages[0].role).toBe("system");
    expect(unified.messages[0].content).toBe("You are helpful.");
    expect(unified.messages[1].role).toBe("user");
    expect(unified.messages[1].content).toBe("Hello");
  });
});
