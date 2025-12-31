import { Transformer } from '../types/transformer';
import { UnifiedChatRequest, UnifiedChatResponse } from '../types/unified';

export class OpenAITransformer implements Transformer {
  defaultEndpoint = '/chat/completions';

  async parseRequest(input: any): Promise<UnifiedChatRequest> {
    return {
        messages: input.messages,
        model: input.model,
        max_tokens: input.max_tokens,
        temperature: input.temperature,
        stream: input.stream,
        tools: input.tools,
        tool_choice: input.tool_choice,
        reasoning: input.reasoning
    };
  }

  async transformRequest(request: UnifiedChatRequest): Promise<any> {
    return {
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        stream: request.stream,
        tools: request.tools,
        tool_choice: request.tool_choice
    };
  }

  async transformResponse(response: any): Promise<UnifiedChatResponse> {
    const choice = response.choices?.[0];
    const message = choice?.message;

    return {
        id: response.id,
        model: response.model,
        created: response.created,
        content: message?.content || null,
        reasoning_content: message?.reasoning_content || null,
        tool_calls: message?.tool_calls,
        usage: response.usage
    };
  }

  async formatResponse(response: UnifiedChatResponse): Promise<any> {
    return {
        id: response.id,
        object: 'chat.completion',
        created: response.created || Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: response.content,
                    reasoning_content: response.reasoning_content,
                    tool_calls: response.tool_calls
                },
                finish_reason: response.tool_calls ? 'tool_calls' : 'stop'
            }
        ],
        usage: response.usage
    };
  }
}