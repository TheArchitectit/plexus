import { expect, test, describe } from "bun:test";
import { AnthropicTransformer } from "../anthropic";
import { UnifiedChatRequest, UnifiedChatResponse } from "../../types/unified";

describe("AnthropicTransformer", () => {
    const transformer = new AnthropicTransformer();

    test("parseRequest converts Anthropic user message to Unified", async () => {
        const input = {
            model: "claude-3",
            messages: [
                { role: "user", content: "Hello" }
            ],
            max_tokens: 100
        };
        const result = await transformer.parseRequest(input);
        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].role).toBe("user");
        expect(result.messages[0].content).toBe("Hello");
        expect(result.model).toBe("claude-3");
    });

    test("formatResponse converts Unified response to Anthropic", async () => {
        const unified: UnifiedChatResponse = {
            id: "msg_123",
            model: "claude-3",
            content: "Hi there",
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        };
        const result = await transformer.formatResponse(unified);
        expect(result.id).toBe("msg_123");
        expect(result.role).toBe("assistant");
        expect(result.content).toBeInstanceOf(Array);
        expect(result.content[0].text).toBe("Hi there");
    });

    test("transformResponse extracts thinking into reasoning_content", async () => {
        const anthropicResponse = {
            id: "msg_think",
            model: "claude-3-5-sonnet",
            content: [
                { type: "thinking", thinking: "I should say hello", signature: "sig1" },
                { type: "text", text: "Hello!" }
            ],
            usage: { input_tokens: 10, output_tokens: 20 }
        };
        const result = await transformer.transformResponse(anthropicResponse);
        expect(result.content).toBe("Hello!");
        expect(result.reasoning_content).toBe("I should say hello");
    });

    test("formatResponse converts reasoning_content to thinking block", async () => {
        const unified: UnifiedChatResponse = {
            id: "unified-think",
            model: "claude-3",
            content: "Hello!",
            reasoning_content: "My internal thought",
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
        };
        const result = await transformer.formatResponse(unified);
        expect(result.content).toHaveLength(2);
        expect(result.content[0].type).toBe("thinking");
        expect(result.content[0].thinking).toBe("My internal thought");
        expect(result.content[1].type).toBe("text");
        expect(result.content[1].text).toBe("Hello!");
    });

    test("usage details are mapped correctly", async () => {
        // Test Anthropic -> Unified (cache read)
        const anthropicResponse = {
            id: "msg_cache",
            model: "claude-3",
            content: [],
            usage: { 
                input_tokens: 100, 
                output_tokens: 50,
                cache_read_input_tokens: 25
            }
        };
        const unified = await transformer.transformResponse(anthropicResponse);
        expect(unified.usage?.prompt_tokens_details?.cached_tokens).toBe(25);

        // Test Unified -> Anthropic (cache read)
        const result = await transformer.formatResponse(unified);
        expect(result.usage.cache_read_input_tokens).toBe(25);
    });
});
