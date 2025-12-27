import { LanguageModel } from "ai";
import { ConvertedRequest } from "../conversion/index.js";
import { convertLanguageModelToolsToToolSet, convertLanguageModelToolChoice} from "../conversion/tools/converter.js";


export function createGenerateTextRequest(convertedRequest: ConvertedRequest, model: LanguageModel) {
  const tools = convertLanguageModelToolsToToolSet(convertedRequest.options.tools);
  const toolChoice = convertLanguageModelToolChoice(
    convertedRequest.options.toolChoice,
    new Set(Object.keys(tools || {}))
  );

  return {
    model: model,
    prompt: convertedRequest.options.prompt,
    temperature: convertedRequest.options.temperature || undefined,
    maxOutputTokens: convertedRequest.options.maxOutputTokens || undefined,
    topP: convertedRequest.options.topP || undefined,
    topK: convertedRequest.options.topK || undefined,
    presencePenalty: convertedRequest.options.presencePenalty || undefined,
    frequencyPenalty: convertedRequest.options.frequencyPenalty || undefined,
    seed: convertedRequest.options.seed || undefined,
    headers: convertedRequest.options.headers || undefined,
    tools: tools || undefined,
    toolChoice: toolChoice || undefined,
  };
}