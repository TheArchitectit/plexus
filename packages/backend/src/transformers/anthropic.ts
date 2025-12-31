import { Transformer } from '../types/transformer';
import { UnifiedChatRequest, UnifiedChatResponse, UnifiedMessage, UnifiedTool, MessageContent } from '../types/unified';
import { logger } from '../utils/logger';

export class AnthropicTransformer implements Transformer {
  defaultEndpoint = '/messages';
  
  // --- 1. Client (Anthropic) -> Unified ---
  async parseRequest(input: any): Promise<UnifiedChatRequest> {
    const messages: UnifiedMessage[] = [];

    // System
    if (input.system) {
      messages.push({ role: 'system', content: input.system });
    }

    // Messages
    if (input.messages) {
      for (const msg of input.messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          if (typeof msg.content === 'string') {
            messages.push({ role: msg.role, content: msg.content });
          } else if (Array.isArray(msg.content)) {
            const unifiedMsg: UnifiedMessage = { role: msg.role, content: '' };
            
            // Check for tool results
            const toolResults = msg.content.filter((c: any) => c.type === 'tool_result');
            if (toolResults.length > 0 && msg.role === 'user') {
                for (const tool of toolResults) {
                    messages.push({
                        role: 'tool',
                        content: typeof tool.content === 'string' ? tool.content : JSON.stringify(tool.content),
                        tool_call_id: tool.tool_use_id,
                    });
                }
                const otherParts = msg.content.filter((c: any) => c.type !== 'tool_result');
                if (otherParts.length > 0) {
                     messages.push({
                        role: 'user',
                        content: this.convertAnthropicContent(otherParts)
                    });
                }
                continue; 
            }

            // Handle tool calls
            const toolUses = msg.content.filter((c: any) => c.type === 'tool_use');
            if (toolUses.length > 0 && msg.role === 'assistant') {
                unifiedMsg.tool_calls = toolUses.map((t: any) => ({
                    id: t.id,
                    type: 'function',
                    function: {
                        name: t.name,
                        arguments: JSON.stringify(t.input)
                    }
                }));
            }

            // Handle Thinking/Reasoning
            const thinkingPart = msg.content.find((c: any) => c.type === 'thinking');
            if (thinkingPart && msg.role === 'assistant') {
                unifiedMsg.thinking = {
                    content: thinkingPart.thinking,
                    signature: thinkingPart.signature
                };
            }

            // Text/Image content
            const contentParts = msg.content.filter((c: any) => c.type !== 'tool_use' && c.type !== 'tool_result' && c.type !== 'thinking');
            if (contentParts.length > 0) {
                 unifiedMsg.content = this.convertAnthropicContent(contentParts);
            } else if (unifiedMsg.tool_calls || unifiedMsg.thinking) {
                unifiedMsg.content = null;
            }

            messages.push(unifiedMsg);
          }
        }
      }
    }

    return {
      messages,
      model: input.model,
      max_tokens: input.max_tokens,
      temperature: input.temperature,
      stream: input.stream,
      tools: input.tools ? this.convertAnthropicToolsToUnified(input.tools) : undefined,
      tool_choice: input.tool_choice
    };
  }

  // --- 4. Unified -> Client (Anthropic) ---
  async formatResponse(response: UnifiedChatResponse): Promise<any> {
    const content: any[] = [];

    // Reasoning/Thinking content
    if (response.reasoning_content) {
        content.push({
            type: 'thinking',
            thinking: response.reasoning_content
        });
    }

    // Text content
    if (response.content) {
        content.push({ type: 'text', text: response.content });
    }

    // Tool Calls
    if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
            content.push({
                type: 'tool_use',
                id: toolCall.id,
                name: toolCall.function.name,
                input: JSON.parse(toolCall.function.arguments)
            });
        }
    }

    return {
        id: response.id,
        type: 'message',
        role: 'assistant',
        model: response.model,
        content,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0,
            cache_read_input_tokens: response.usage?.prompt_tokens_details?.cached_tokens || 0,
            // Anthropic doesn't explicitly return reasoning tokens in usage object typically, but if we had to map it:
            // It might be implicitly part of output_tokens.
        }
    };
  }

  // --- 2. Unified -> Provider (Anthropic) ---
  async transformRequest(request: UnifiedChatRequest): Promise<any> {
    let system: string | undefined;
    const messages: any[] = [];

    for (const msg of request.messages) {
        if (msg.role === 'system') {
            system = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        } else if (msg.role === 'user' || msg.role === 'assistant') {
            const content: any[] = [];
            
            if (msg.thinking) {
                content.push({
                    type: 'thinking',
                    thinking: msg.thinking.content,
                    signature: msg.thinking.signature
                });
            }

            if (msg.content) {
                if (typeof msg.content === 'string') {
                    content.push({ type: 'text', text: msg.content });
                } else if (Array.isArray(msg.content)) {
                    for (const part of msg.content) {
                        if (part.type === 'text') {
                            content.push({ type: 'text', text: part.text });
                        } else if (part.type === 'image_url') {
                             content.push({ type: 'image', source: { type: 'base64', media_type: part.media_type || 'image/jpeg', data: '' } }); 
                        }
                    }
                }
            }

            if (msg.role === 'assistant' && msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                    content.push({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.function.name,
                        input: JSON.parse(tc.function.arguments)
                    });
                }
            }

            messages.push({ role: msg.role, content });
        } else if (msg.role === 'tool') {
             messages.push({
                 role: 'user',
                 content: [{
                     type: 'tool_result',
                     tool_use_id: msg.tool_call_id,
                     content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                 }]
             });
        }
    }

    const mergedMessages: any[] = [];
    for (const msg of messages) {
        if (mergedMessages.length > 0) {
            const last = mergedMessages[mergedMessages.length - 1];
            if (last.role === msg.role && msg.role === 'user') {
                last.content.push(...msg.content);
                continue;
            }
        }
        mergedMessages.push(msg);
    }

    return {
        model: request.model,
        messages: mergedMessages,
        system,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature,
        stream: request.stream,
        tools: request.tools ? this.convertUnifiedToolsToAnthropic(request.tools) : undefined
    };
  }

  // --- 3. Provider (Anthropic) -> Unified ---
  async transformResponse(response: any): Promise<UnifiedChatResponse> {
    const contentBlocks = response.content || [];
    let text = '';
    let reasoning = '';
    const toolCalls: any[] = [];

    for (const block of contentBlocks) {
        if (block.type === 'text') {
            text += block.text;
        } else if (block.type === 'thinking') {
            reasoning += block.thinking;
        } else if (block.type === 'tool_use') {
            toolCalls.push({
                id: block.id,
                type: 'function',
                function: {
                    name: block.name,
                    arguments: JSON.stringify(block.input)
                }
            });
        }
    }

    return {
        id: response.id,
        model: response.model,
        content: text || null,
        reasoning_content: reasoning || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
            prompt_tokens_details: {
                cached_tokens: response.usage?.cache_read_input_tokens || 0
            }
        }
    };
  }

  // Helpers

  private convertAnthropicContent(content: any[]): string | MessageContent[] {
     const parts: MessageContent[] = [];
     for (const c of content) {
         if (c.type === 'text') parts.push({ type: 'text', text: c.text });
     }
     if (parts.length === 1 && parts[0].type === 'text') return parts[0].text;
     return parts;
  }

  private convertAnthropicToolsToUnified(tools: any[]): UnifiedTool[] {
      return tools.map(t => ({
          type: 'function',
          function: {
              name: t.name,
              description: t.description,
              parameters: t.input_schema
          }
      }));
  }

  private convertUnifiedToolsToAnthropic(tools: UnifiedTool[]): any[] {
      return tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters
      }));
  }
}
