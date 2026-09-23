import { AIProviderError, providerError } from "../errors";
import type { AIGenerateInput, AIGenerateResult, AIProvider } from "../types";
import { openAICompatibleProvider } from "./shared";

type Binding = { run(model: string, input: Record<string, unknown>): Promise<unknown> };

export const cloudflareProvider = (model: string, accountId?: string, token?: string, useBinding = false): AIProvider => {
  const rest = openAICompatibleProvider({ name: "cloudflare", model, apiKey: accountId && token ? token : undefined, endpoint: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId || "")}/ai/v1/chat/completions` });
  if (!useBinding) return rest;
  return {
    name: "cloudflare",
    model,
    configured: true,
    async generate(input: AIGenerateInput, signal?: AbortSignal): Promise<AIGenerateResult> {
      if (input.attachments?.length) throw new AIProviderError("BAD_REQUEST", "This Workers AI model accepts text only");
      if (signal?.aborted) throw new AIProviderError("TIMEOUT", "Provider timed out", 408);
      const started = Date.now();
      let result: unknown;
      try {
        const workers = await import("cloudflare:workers");
        const binding = (workers.env as unknown as { AI?: Binding }).AI;
        if (!binding) throw new AIProviderError("AUTH", "Workers AI binding is unavailable");
        result = await binding.run(model, {
          messages: [{ role: "system", content: input.systemPrompt }, { role: "user", content: input.userPrompt }],
          temperature: input.temperature ?? 0.2,
          max_tokens: input.maxTokens ?? 1200,
        });
      } catch (error) { throw providerError(error); }
      const data = result as { response?: unknown; choices?: Array<{ message?: { content?: unknown } }>; model?: string } | null;
      const content = data?.choices?.[0]?.message?.content ?? data?.response;
      const text = typeof content === "string" ? content.trim() : "";
      if (!text) throw new AIProviderError("MALFORMED", "Missing Workers AI text");
      return { text, provider: "cloudflare", model: data?.model || model, latencyMs: Date.now() - started };
    },
  };
};
