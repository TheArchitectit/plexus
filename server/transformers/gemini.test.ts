import { describe, test, expect, beforeEach } from "bun:test";
import { GeminiTransformer } from "./gemini";
import type { UnifiedChatRequest, UnifiedChatResponse, UnifiedUsage } from "./types";

describe("GeminiTransformer", () => {
  let transformer: GeminiTransformer;

  beforeEach(() => {
    transformer = new GeminiTransformer();
  });

  describe("parseRequest (Gemini -> Unified)", () => {
    test("parses simple text message", async () => {
      const input = {
        contents: [
          {
            role: "user",
            parts: [{ text: "Hello, world!" }],
          },
        ],
        model: "gemini-1.5-pro",
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      };

      const result = await transformer.parseRequest(input);

      expect(result.model).toBe("gemini-1.5-pro");
      expect(result.max_tokens).toBe(1024);
      expect(result.temperature).toBe(0.7);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]!.role).toBe("user");
    expect(result.messages[0]!.content).toBe("Hello, world!");
    });

    test("parses multi-turn conversation", async () => {
      const input = {
        contents: [
          { role: "user", parts: [{ text: "Hi!" }] },
          { role: "model", parts: [{ text: "Hello! How can I help?" }] },
          { role: "user", parts: [{ text: "Tell me a joke" }] },
        ],
        model: "gemini-1.5-flash",
      };

      const result = await transformer.parseRequest(input);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]!.role).toBe("user");
      expect(result.messages[1]!.role).toBe("assistant");
      expect(result.messages[2]!.role).toBe("user");
    });

    test("parses inline image data", async () => {
      const input = {
        contents: [
          {
            role: "user",
            parts: [
              { text: "What is in this image?" },
              { inlineData: { mimeType: "image/png", data: "base64data" } },
            ],
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.parseRequest(input);

      expect(result.messages).toHaveLength(1);
      const content = result.messages[0]!.content as any[];
      expect(content).toHaveLength(2);
      expect(content[0]!.type).toBe("text");
      expect(content[1]!.type).toBe("image_url");
      expect(content[1]!.image_url.url).toBe("data:image/png;base64,base64data");
    });

    test("parses fileData as image URL", async () => {
      const input = {
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: "image/jpeg",
                  fileUri: "gs://bucket/image.jpg",
                },
              },
            ],
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.parseRequest(input);

    const content = result.messages[0]!.content as any[];
      expect(content[0]!.type).toBe("image_url");
      expect(content[0]!.image_url.url).toBe("gs://bucket/image.jpg");
      expect(content[0]!.media_type).toBe("image/jpeg");
    });

    test("parses function calls", async () => {
      const input = {
        contents: [
          {
            role: "model",
            parts: [
              {
                functionCall: {
                  name: "get_weather",
                  args: { location: "San Francisco" },
                },
              },
            ],
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.parseRequest(input);

      expect(result.messages[0]!.role).toBe("assistant");
      expect(result.messages[0]!.tool_calls).toHaveLength(1);
      expect(result.messages[0]!.tool_calls![0]!.function.name).toBe("get_weather");
      expect(result.messages[0]!.tool_calls![0]!.function.arguments).toBe(
        '{"location":"San Francisco"}'
      );
    });

    test("parses function responses", async () => {
      const input = {
        contents: [
          {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: "get_weather",
                  response: { temperature: 72, conditions: "sunny" },
                },
              },
            ],
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.parseRequest(input);

      expect(result.messages[0]!.role).toBe("tool");
      expect(result.messages[0]!.name).toBe("get_weather");
    });

    test("parses thinking/thought content with signature", async () => {
      const input = {
        contents: [
          {
            role: "model",
            parts: [
              { text: "Let me think about this...", thought: true, thoughtSignature: "sig123" },
              { text: "The answer is 42." },
            ],
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.parseRequest(input);

      expect(result.messages[0]!.thinking?.content).toBe("Let me think about this...");
      expect(result.messages[0]!.thinking?.signature).toBe("sig123");
      expect(result.messages[0]!.content).toBe("The answer is 42.");
    });

    test("parses generationConfig parameters", async () => {
      const input = {
        contents: [],
        model: "gemini-1.5-pro",
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.9,
          topP: 0.95,
          stopSequences: ["END", "STOP"],
          responseMimeType: "application/json",
          responseJsonSchema: { type: "object" },
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 1000,
          },
        },
      };

      const result = await transformer.parseRequest(input);

      expect(result.max_tokens).toBe(2048);
      expect(result.temperature).toBe(0.9);
      expect(result.top_p).toBe(0.95);
      expect(result.stop).toEqual(["END", "STOP"]);
      expect(result.response_format?.type).toBe("json_schema");
      expect(result.reasoning?.enabled).toBe(true);
      expect(result.reasoning?.max_tokens).toBe(1000);
    });

    test("parses toolConfig to tool_choice", async () => {
      const testCases = [
        { toolConfig: { functionCallingConfig: { mode: "NONE" } }, expected: "none" },
        { toolConfig: { functionCallingConfig: { mode: "AUTO" } }, expected: "auto" },
        { toolConfig: { functionCallingConfig: { mode: "ANY" } }, expected: "required" },
        {
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["specific_fn"],
            },
          },
          expected: { type: "function", function: { name: "specific_fn" } },
        },
      ];

      for (const tc of testCases) {
        const input = {
          contents: [],
          model: "gemini-1.5-pro",
          ...tc,
        };
        const result = await transformer.parseRequest(input);
        expect(result.tool_choice).toEqual(tc.expected as any);
      }
    });
  });

  describe("transformRequest (Unified -> Gemini)", () => {
    test("transforms simple user message", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Hello!" }],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]!.role).toBe("user");
      expect(result.contents[0]!.parts![0]!.text).toBe("Hello!");
    });

    test("transforms assistant message to model role", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "assistant", content: "I can help with that." }],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      expect(result.contents[0]!.role).toBe("model");
    });

    test("transforms system message to user role", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      expect(result.contents[0]!.role).toBe("user");
      expect(result.contents[0]!.parts![0]!.text).toBe("You are a helpful assistant.");
    });

    test("transforms tool message to functionResponse", async () => {
      const request: UnifiedChatRequest = {
        messages: [
          {
            role: "tool",
            content: '{"result": "success"}',
            tool_call_id: "call_123",
            name: "my_function",
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      expect(result.contents[0]!.role).toBe("user");
      expect(result.contents[0]!.parts![0]!.functionResponse).toBeDefined();
      expect(result.contents[0]!.parts![0]!.functionResponse!.name).toBe("my_function");
    });

    test("transforms tool definitions to functionDeclarations", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Get the weather" }],
        model: "gemini-1.5-pro",
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather for a location",
              parameters: {
                type: "object",
                properties: { location: { type: "string" } },
                required: ["location"],
              },
            },
          },
        ],
      };

      const result = await transformer.transformRequest(request);

      expect(result.tools).toHaveLength(1);
      expect(result.tools![0]!.functionDeclarations).toHaveLength(1);
      expect(result.tools![0]!.functionDeclarations![0]!.name).toBe("get_weather");
    });

    test("transforms google_search tool to native format", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Search the web" }],
        model: "gemini-1.5-pro",
        tools: [
          {
            type: "function",
            function: {
              name: "google_search",
              description: "Search Google",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      };

      const result = await transformer.transformRequest(request);

      expect(result.tools).toHaveLength(1);
      expect((result.tools![0] as any).googleSearch).toBeDefined();
    });

    test("transforms tool_choice variations", async () => {
      const testCases = [
        { tool_choice: "none", expectedMode: "NONE" },
        { tool_choice: "auto", expectedMode: "AUTO" },
        { tool_choice: "required", expectedMode: "ANY" },
      ];

      for (const tc of testCases) {
        const request: UnifiedChatRequest = {
          messages: [{ role: "user", content: "Test" }],
          model: "gemini-1.5-pro",
          tool_choice: tc.tool_choice as any,
        };

        const result = await transformer.transformRequest(request);
        expect(result.toolConfig?.functionCallingConfig?.mode).toBe(tc.expectedMode as any);
      }
    });

    test("transforms specific function tool_choice", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Test" }],
        model: "gemini-1.5-pro",
        tool_choice: { type: "function", function: { name: "my_func" } },
      };

      const result = await transformer.transformRequest(request);

      expect(result.toolConfig?.functionCallingConfig?.mode).toBe("ANY");
      expect(result.toolConfig?.functionCallingConfig?.allowedFunctionNames).toEqual([
        "my_func",
      ]);
    });

    test("includes safety settings by default", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Hello" }],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      expect(result.safetySettings).toBeDefined();
      expect(result.safetySettings).toHaveLength(5);
      expect(result.safetySettings![0]!.threshold).toBe("BLOCK_NONE");
    });

    test("transforms generation config parameters", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Test" }],
        model: "gemini-1.5-pro",
        max_tokens: 2048,
        temperature: 0.8,
        top_p: 0.95,
        stop: ["END", "STOP"],
      };

      const result = await transformer.transformRequest(request);

      expect(result.generationConfig?.maxOutputTokens).toBe(2048);
      expect(result.generationConfig?.temperature).toBe(0.8);
      expect(result.generationConfig?.topP).toBe(0.95);
      expect(result.generationConfig?.stopSequences).toEqual(["END", "STOP"]);
    });

    test("transforms single stop string to array", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Test" }],
        model: "gemini-1.5-pro",
        stop: "STOP",
      };

      const result = await transformer.transformRequest(request);

      expect(result.generationConfig?.stopSequences).toEqual(["STOP"]);
    });

    test("transforms response_format to responseMimeType", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Test" }],
        model: "gemini-1.5-pro",
        response_format: {
          type: "json_schema",
          json_schema: { type: "object" },
        },
      };

      const result = await transformer.transformRequest(request);

      expect(result.generationConfig?.responseMimeType).toBe("application/json");
      expect(result.generationConfig?.responseJsonSchema).toEqual({ type: "object" });
    });

    test("transforms reasoning config to thinkingConfig", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Test" }],
        model: "gemini-1.5-pro",
        reasoning: {
          enabled: true,
          max_tokens: 5000,
        },
      };

      const result = await transformer.transformRequest(request);

      expect(result.generationConfig?.thinkingConfig?.includeThoughts).toBe(true);
      expect(result.generationConfig?.thinkingConfig?.thinkingBudget).toBe(5000);
    });

    test("transforms modalities to responseModalities", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Generate an image" }],
        model: "gemini-1.5-pro",
        modalities: ["image", "text"],
      };

      const result = await transformer.transformRequest(request);

      expect(result.generationConfig?.responseModalities).toEqual(["IMAGE", "TEXT"]);
    });

    test("transforms image_config with aspect_ratio", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "user", content: "Generate an image" }],
        model: "gemini-2.5-flash-image-preview",
        image_config: { aspect_ratio: "16:9" },
      };

      const result = await transformer.transformRequest(request);

      expect(result.generationConfig?.imageConfig?.aspectRatio).toBe("16:9");
      expect(result.generationConfig?.responseModalities).toEqual(["IMAGE", "TEXT"]);
    });

    test("transforms inline image with correct MIME type extraction", async () => {
      const request: UnifiedChatRequest = {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this" },
              {
                type: "image_url",
                image_url: { url: "data:image/webp;base64,abc123" },
              },
            ],
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      const parts: any = result.contents[0]!.parts;
      expect(parts![1].inlineData?.mimeType).toBe("image/webp");
      expect(parts![1].inlineData?.data).toBe("abc123");
    });

    test("transforms thinking content with signature", async () => {
      const request: UnifiedChatRequest = {
        messages: [
          {
            role: "assistant",
            content: "The answer is 42.",
            thinking: {
              content: "Let me reason through this...",
              signature: "sig_abc123",
            },
          },
        ],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      const parts: any = result.contents[0]!.parts;
      expect(parts![0].text).toBe("Let me reason through this...");
      expect((parts[0] as any).thought).toBe(true);
    });
  });

  describe("transformResponse (Gemini -> Unified)", () => {
    test("transforms text response", async () => {
      const response = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ text: "Hello! How can I help you?" }],
            },
            finishReason: "STOP",
          },
        ],
        responseId: "resp_123",
        modelVersion: "gemini-1.5-pro",
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      const result = await transformer.transformResponse(response);

      expect(result.id).toBe("resp_123");
      expect(result.model).toBe("gemini-1.5-pro");
      expect(result.content).toBe("Hello! How can I help you?");
      expect(result.usage?.input_tokens).toBe(10);
      expect(result.usage?.output_tokens).toBe(20);
    });

    test("transforms function call response", async () => {
      const response = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: "get_weather",
                    args: { location: "NYC" },
                  },
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
        responseId: "resp_456",
        modelVersion: "gemini-1.5-pro",
      };

      const result = await transformer.transformResponse(response);

      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls![0]!.function.name).toBe("get_weather");
      expect(result.tool_calls![0]!.function.arguments).toBe('{"location":"NYC"}');
      // Verify unique ID generation
      expect(result.tool_calls![0]!.id).toMatch(/^get_weather_\d+_\d+$/);
    });

    test("transforms thinking content response", async () => {
      const response = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                { text: "Thinking...", thought: true, thoughtSignature: "sig999" },
                { text: "The answer is 42." },
              ],
            },
          },
        ],
        responseId: "resp_789",
        modelVersion: "gemini-1.5-pro",
      };

      const result = await transformer.transformResponse(response);

      expect(result.reasoning_content).toBe("Thinking...");
      expect(result.content).toBe("The answer is 42.");
      expect(result.thinking?.signature).toBe("sig999");
    });

    test("transforms image output response", async () => {
      const response = {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                { text: "Here is your image:" },
                { inlineData: { mimeType: "image/png", data: "base64imagedata" } },
              ],
            },
          },
        ],
        responseId: "resp_img",
        modelVersion: "gemini-2.5-flash",
      };

      const result = await transformer.transformResponse(response);

      expect(result.content).toBe("Here is your image:");
      expect(result.images).toHaveLength(1);
      expect(result.images![0]!.mimeType).toBe("image/png");
      expect(result.images![0]!.data).toBe("base64imagedata");
    });
  });

  describe("formatResponse (Unified -> Gemini)", () => {
    test("formats text response", async () => {
      const response: UnifiedChatResponse = {
        id: "resp_123",
        model: "gemini-1.5-pro",
        content: "Hello!",
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
        },
      };

      const result = await transformer.formatResponse(response);

      expect(result.candidates[0]!.content.parts![0]!.text).toBe("Hello!");
      expect(result.modelVersion).toBe("gemini-1.5-pro");
      expect(result.usageMetadata.promptTokenCount).toBe(10);
    });

    test("formats reasoning content", async () => {
      const response: UnifiedChatResponse = {
        id: "resp_123",
        model: "gemini-1.5-pro",
        content: "Answer is 42",
        reasoning_content: "Let me think...",
        thinking: { content: "Let me think...", signature: "sig123" },
      };

      const result = await transformer.formatResponse(response);

      const parts: any = result.candidates[0]!.content.parts;
      expect(parts![0].text).toBe("Let me think...");
      expect((parts[0] as any).thought).toBe(true);
      expect((parts[0] as any).thoughtSignature).toBe("sig123");
      expect(parts![1].text).toBe("Answer is 42");
    });

    test("formats tool calls", async () => {
      const response: UnifiedChatResponse = {
        id: "resp_123",
        model: "gemini-1.5-pro",
        content: null,
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: { name: "search", arguments: '{"q":"test"}' },
          },
        ],
      };

      const result = await transformer.formatResponse(response);

      expect(result.candidates[0]!.content.parts[0]!.functionCall.name).toBe("search");
      expect(result.candidates[0]!.content.parts[0]!.functionCall.args).toEqual({ q: "test" });
    });

    test("formats image outputs", async () => {
      const response: UnifiedChatResponse = {
        id: "resp_img",
        model: "gemini-2.5-flash",
        content: "Here is your image",
        images: [{ data: "base64data", mimeType: "image/png" }],
      };

      const result = await transformer.formatResponse(response);

      const parts: any = result.candidates[0]!.content.parts;
      expect(parts![0].text).toBe("Here is your image");
      expect(parts![1].inlineData.mimeType).toBe("image/png");
      expect(parts![1].inlineData.data).toBe("base64data");
    });
  });

  describe("parseUsage / formatUsage", () => {
    test("parseUsage handles all token types", () => {
      const input = {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150,
        thoughtsTokenCount: 25,
        cachedContentTokenCount: 30,
      };

      const result = transformer.parseUsage(input);

      expect(result.input_tokens).toBe(100);
      expect(result.output_tokens).toBe(50);
      expect(result.total_tokens).toBe(150);
      expect(result.reasoning_tokens).toBe(25);
      expect(result.cache_read_tokens).toBe(30);
    });

    test("parseUsage handles null input", () => {
      const result = transformer.parseUsage(null);

      expect(result.input_tokens).toBe(0);
      expect(result.output_tokens).toBe(0);
      expect(result.total_tokens).toBe(0);
    });

    test("formatUsage round-trips correctly", () => {
      const usage: UnifiedUsage = {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        reasoning_tokens: 25,
        cache_read_tokens: 30,
      };

      const formatted = transformer.formatUsage(usage);
      const parsed = transformer.parseUsage(formatted);

      expect(parsed.input_tokens).toBe(usage.input_tokens);
      expect(parsed.output_tokens).toBe(usage.output_tokens);
      expect(parsed.total_tokens).toBe(usage.total_tokens);
      expect(parsed.reasoning_tokens).toBe(usage.reasoning_tokens);
      expect(parsed.cache_read_tokens).toBe(usage.cache_read_tokens);
    });
  });

  describe("getEndpoint", () => {
    test("returns non-streaming endpoint", () => {
      const request: UnifiedChatRequest = {
        messages: [],
        model: "gemini-1.5-pro",
        stream: false,
      };

      const result = transformer.getEndpoint(request);

      expect(result).toBe("/v1beta/models/gemini-1.5-pro:generateContent");
    });

    test("returns streaming endpoint with alt=sse", () => {
      const request: UnifiedChatRequest = {
        messages: [],
        model: "gemini-1.5-pro",
        stream: true,
      };

      const result = transformer.getEndpoint(request);

      expect(result).toBe("/v1beta/models/gemini-1.5-pro:streamGenerateContent?alt=sse");
    });

    test("handles models/ prefix", () => {
      const request: UnifiedChatRequest = {
        messages: [],
        model: "models/gemini-1.5-pro",
        stream: false,
      };

      const result = transformer.getEndpoint(request);

      expect(result).toBe("/v1beta/models/gemini-1.5-pro:generateContent");
    });

    test("handles tunedModels/ prefix", () => {
      const request: UnifiedChatRequest = {
        messages: [],
        model: "tunedModels/my-model",
        stream: false,
      };

      const result = transformer.getEndpoint(request);

      expect(result).toBe("/v1beta/tunedModels/my-model:generateContent");
    });
  });

  describe("reconstructResponseFromStream", () => {
    test("reconstructs response from SSE chunks", () => {
      const rawSSE = `data: {"responseId":"resp_1","modelVersion":"gemini-1.5-pro","candidates":[{"content":{"role":"model","parts":[{"text":"Hello "}]}}]}

data: {"responseId":"resp_1","modelVersion":"gemini-1.5-pro","candidates":[{"content":{"role":"model","parts":[{"text":"world!"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5,"totalTokenCount":15}}

data: [DONE]
`;

      const result = transformer.reconstructResponseFromStream(rawSSE);

      expect(result).not.toBeNull();
      expect(result!.id).toBe("resp_1");
      expect(result!.model).toBe("gemini-1.5-pro");
      expect(result!.choices[0]!.message.content).toBe("Hello world!");
      expect(result!.choices[0]!.finish_reason).toBe("stop");
    });

    test("reconstructs thinking content from stream", () => {
      const rawSSE = `data: {"responseId":"resp_2","modelVersion":"gemini-1.5-pro","candidates":[{"content":{"role":"model","parts":[{"text":"Thinking...","thought":true}]}}]}

data: {"responseId":"resp_2","modelVersion":"gemini-1.5-pro","candidates":[{"content":{"role":"model","parts":[{"text":"Answer: 42"}]},"finishReason":"STOP"}]}
`;

      const result = transformer.reconstructResponseFromStream(rawSSE);

      expect(result!.choices[0]!.message.content).toBe("Answer: 42");
      expect(result!.choices[0]!.message.reasoning_content).toBe("Thinking...");
    });

    test("reconstructs function calls from stream", () => {
      const rawSSE = `data: {"responseId":"resp_3","modelVersion":"gemini-1.5-pro","candidates":[{"content":{"role":"model","parts":[{"functionCall":{"name":"get_weather","args":{"loc":"NYC"}}}]},"finishReason":"STOP"}]}
`;

      const result = transformer.reconstructResponseFromStream(rawSSE);

      expect(result!.choices[0]!.message.tool_calls).toHaveLength(1);
      expect(result!.choices[0]!.message.tool_calls![0]!.function.name).toBe("get_weather");
    });

    test("returns null for empty/invalid SSE", () => {
      const result = transformer.reconstructResponseFromStream("");
      expect(result).toBeNull();
    });

    test("maps MAX_TOKENS finish reason to length", () => {
      const rawSSE = `data: {"responseId":"resp_4","modelVersion":"gemini-1.5-pro","candidates":[{"content":{"role":"model","parts":[{"text":"truncated"}]},"finishReason":"MAX_TOKENS"}]}
`;

      const result = transformer.reconstructResponseFromStream(rawSSE);
      expect(result!.choices[0]!.finish_reason).toBe("length");
    });
  });

  describe("Edge Cases", () => {
    test("handles empty messages array", async () => {
      const request: UnifiedChatRequest = {
        messages: [],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      expect(result.contents).toHaveLength(0);
    });

    test("handles null content in message", async () => {
      const request: UnifiedChatRequest = {
        messages: [{ role: "assistant", content: null }],
        model: "gemini-1.5-pro",
      };

      const result = await transformer.transformRequest(request);

      // Should not throw, parts may be empty
      expect(result.contents).toBeDefined();
    });

    test("handles response without candidates", async () => {
      const response = {
        responseId: "resp_empty",
        modelVersion: "gemini-1.5-pro",
      };

      const result = await transformer.transformResponse(response);

      expect(result.content).toBeNull();
      expect(result.tool_calls).toBeUndefined();
    });
  });
});
