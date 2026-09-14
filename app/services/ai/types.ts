export type AIProviderName = "gemini" | "groq" | "mistral" | "openrouter" | "cloudflare";

export type AIAttachment = { mimeType: string; base64: string };

export type AIGenerateInput = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  attachments?: AIAttachment[];
};

export type AIGenerateResult = {
  text: string;
  provider: AIProviderName;
  model: string;
  latencyMs: number;
  quotaRemaining?: string;
};

export interface AIProvider {
  name: AIProviderName;
  model: string;
  configured: boolean;
  generate(input: AIGenerateInput, signal?: AbortSignal): Promise<AIGenerateResult>;
}
