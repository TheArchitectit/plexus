import { z } from "zod";

// OpenAI Tool definitions
export const OpenAIToolSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
  }),
});

export type OpenAITool = z.infer<typeof OpenAIToolSchema>;

// OpenAI Tool Call
export const OpenAIToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

export type OpenAIToolCall = z.infer<typeof OpenAIToolCallSchema>;

// OpenAI Tool Choice
export const OpenAIToolChoiceSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
  }),
});

export type OpenAIToolChoice = z.infer<typeof OpenAIToolChoiceSchema>;

// OpenAI Chat Message
export const OpenAIChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().nullable(),
  name: z.string().optional(),
  tool_calls: z.array(OpenAIToolCallSchema).optional(),
  tool_call_id: z.string().optional(),
});

export type OpenAIChatMessage = z.infer<typeof OpenAIChatMessageSchema>;

// OpenAI Chat Completion Request
export const OpenAIChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(OpenAIChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).optional(),
  stream: z.boolean().optional().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  user: z.string().optional(),
  tools: z.array(OpenAIToolSchema).optional(),
  tool_choice: z.union([
    z.enum(["none", "auto", "required"]),
    OpenAIToolChoiceSchema,
  ]).optional(),
});

export type OpenAIChatCompletionRequest = z.infer<typeof OpenAIChatCompletionRequestSchema>;

// OpenAI Choice
export const OpenAIChoiceSchema = z.object({
  index: z.number().int(),
  message: OpenAIChatMessageSchema,
  finish_reason: z.enum(["stop", "length", "tool_calls", "content_filter"]).nullable(),
});

export type OpenAIChoice = z.infer<typeof OpenAIChoiceSchema>;

// OpenAI Usage
export const OpenAIUsageSchema = z.object({
  prompt_tokens: z.number().int(),
  completion_tokens: z.number().int(),
  total_tokens: z.number().int(),
});

export type OpenAIUsage = z.infer<typeof OpenAIUsageSchema>;

// OpenAI Chat Completion Response
export const OpenAIChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(OpenAIChoiceSchema),
  usage: OpenAIUsageSchema,
  system_fingerprint: z.string().optional(),
});

export type OpenAIChatCompletionResponse = z.infer<typeof OpenAIChatCompletionResponseSchema>;
