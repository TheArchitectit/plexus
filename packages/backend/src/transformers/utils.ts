import { ThinkLevel } from "./types";

export const getThinkLevel = (thinking_budget: number): ThinkLevel => {
  if (thinking_budget <= 0) return "none";
  if (thinking_budget <= 1024) return "low";
  if (thinking_budget <= 8192) return "medium";
  return "high";
};

export const formatBase64 = (data: string, media_type: string) => {
  if (data.includes("base64")) {
    data = data.split("base64").pop() as string;
    if (data.startsWith(",")) {
      data = data.slice(1);
    }
  }
  return `data:${media_type};base64,${data}`;
};
