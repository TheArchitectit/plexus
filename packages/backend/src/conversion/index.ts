export interface ConvertedRequest {
  model?: string;
  prompt: any;
  options: Partial<any>;
  warnings?: Array<{ type: string; message: string }>;
}