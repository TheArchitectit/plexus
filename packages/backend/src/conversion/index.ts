import { LanguageModelV2CallOptions } from "@ai-sdk/provider";

export interface ConvertedRequest {
  model: string;
  options: LanguageModelV2CallOptions;
  warnings?: Array<{ type: string; message: string }>;
}