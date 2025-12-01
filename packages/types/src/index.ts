import { z } from 'zod';

// Chat Completion Schema
export const chatCompletionSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })
  ),
  model: z.string().optional(),
  temperature: z.number().optional(),
});

export type ChatCompletionRequest = z.infer<typeof chatCompletionSchema>;
