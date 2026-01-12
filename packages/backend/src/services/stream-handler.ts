import { logger } from "../utils/logger";
import type { StreamMetrics, PlexusStreamContext } from "../types/streaming";
import type { ApiType } from "./transformer-factory";

/**
 * SSE line parser that handles both OpenAI and Anthropic formats
 */
export class SSEParser {
  /**
   * Parse a single SSE line
   * Handles both OpenAI format ("data: ...") and Anthropic format ("event: ...\ndata: ...")
   */
  static parseLine(line: string): {
    event?: string;
    data?: string;
    isDone: boolean;
  } | null {
    const trimmed = line.trim();
    
    if (!trimmed) {
      return null;
    }

    // Handle OpenAI [DONE] marker
    if (trimmed === "data: [DONE]") {
      return { isDone: true };
    }

    // Handle data lines
    if (trimmed.startsWith("data: ")) {
      const data = trimmed.substring(6);
      return { data, isDone: false };
    }

    // Handle event lines (Anthropic format)
    if (trimmed.startsWith("event: ")) {
      const event = trimmed.substring(7);
      return { event, isDone: false };
    }

    return null;
  }

  /**
   * Parse JSON data from SSE chunk, handling errors gracefully
   */
  static parseJSON(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      logger.debug("Failed to parse SSE JSON", { data, error });
      return null;
    }
  }

  /**
   * Check if an Anthropic event is a stop event
   */
  static isAnthropicStop(event: string): boolean {
    return event === "message_stop";
  }

  /**
   * Extract content from parsed chunk (for token counting)
   */
  static extractContent(parsed: any, apiType: ApiType): string | null {
    if (apiType === "chat") {
      // OpenAI format
      return parsed?.choices?.[0]?.delta?.content || null;
    } else {
      // Anthropic format
      if (parsed?.type === "content_block_delta") {
        return parsed?.delta?.text || null;
      }
    }
    return null;
  }
}

/**
 * Stream handler for processing and transforming SSE streams
 */
export class StreamHandler {
  private context: PlexusStreamContext;
  private requestLogger;

  constructor(
    requestId: string,
    clientFormat: ApiType,
    providerFormat: ApiType
  ) {
    this.context = {
      requestId,
      startTime: Date.now(),
      firstTokenTime: null,
      tokenCount: 0,
      clientFormat,
      providerFormat,
      passthrough: clientFormat === providerFormat,
    };
    this.requestLogger = logger.child({ requestId, component: "StreamHandler" });
  }

  /**
   * Create a transform stream that processes SSE chunks
   */
  createTransformStream(
    transformer?: (chunk: any, event?: string) => string | null
  ): TransformStream<Uint8Array, Uint8Array> {
    const context = this.context;
    const requestLogger = this.requestLogger;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = "";
    let currentEvent: string | undefined;

    return new TransformStream({
      transform(chunk, controller) {
        try {
          // Decode incoming chunk and add to buffer
          buffer += decoder.decode(chunk, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const parsed = SSEParser.parseLine(line);
            
            if (!parsed) {
              continue;
            }

            // Handle [DONE] marker or message_stop
            if (parsed.isDone || (parsed.event && SSEParser.isAnthropicStop(parsed.event))) {
              requestLogger.debug("Stream end marker detected");
              continue;
            }

            // Track event type (for Anthropic format)
            if (parsed.event) {
              currentEvent = parsed.event;
            }

            // Process data
            if (parsed.data) {
              const jsonData = SSEParser.parseJSON(parsed.data);
              
              if (!jsonData) {
                continue;
              }

              // Track first token
              const content = SSEParser.extractContent(jsonData, context.providerFormat);
              if (content && context.firstTokenTime === null) {
                context.firstTokenTime = Date.now();
                const ttft = context.firstTokenTime - context.startTime;
                requestLogger.info("First token received", { ttft });
              }

              // Count tokens (rough estimate based on content length)
              if (content) {
                context.tokenCount += Math.ceil(content.length / 4);
              }

              // Transform if needed
              if (transformer && !context.passthrough) {
                const transformed = transformer(jsonData, currentEvent);
                if (transformed) {
                  controller.enqueue(encoder.encode(transformed));
                }
              } else {
                // Passthrough: forward original line
                controller.enqueue(encoder.encode(line + "\n"));
              }

              // Reset event after data
              currentEvent = undefined;
            }
          }
        } catch (error) {
          requestLogger.error("Stream transform error", {
            error: error instanceof Error ? error.message : String(error),
          });
          controller.error(error);
        }
      },

      flush(controller) {
        try {
          // Calculate final metrics
          const endTime = Date.now();
          const metrics: StreamMetrics = {
            ttft: context.firstTokenTime ? context.firstTokenTime - context.startTime : null,
            streamDuration: endTime - context.startTime,
            totalTokens: context.tokenCount,
            tokensPerSecond:
              context.firstTokenTime && context.tokenCount > 0
                ? (context.tokenCount / (endTime - context.startTime)) * 1000
                : null,
          };

          requestLogger.info("Stream completed", metrics);

          // Send final marker based on client format
          if (context.clientFormat === "chat") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } else {
            // Anthropic format ends with message_stop
            controller.enqueue(
              encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n')
            );
          }
        } catch (error) {
          requestLogger.error("Stream flush error", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    });
  }

  /**
   * Get current stream metrics
   */
  getMetrics(): StreamMetrics {
    const now = Date.now();
    return {
      ttft: this.context.firstTokenTime
        ? this.context.firstTokenTime - this.context.startTime
        : null,
      streamDuration: now - this.context.startTime,
      totalTokens: this.context.tokenCount,
      tokensPerSecond:
        this.context.firstTokenTime && this.context.tokenCount > 0
          ? (this.context.tokenCount / (now - this.context.startTime)) * 1000
          : null,
    };
  }
}
