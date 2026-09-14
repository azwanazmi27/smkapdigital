import { AIProviderError, providerError } from "../errors";
import type { AIGenerateInput, AIGenerateResult, AIProviderName } from "../types";

type CompatibleOptions = { name: AIProviderName; model: string; apiKey?: string; endpoint: string; extraHeaders?: Record<string, string> };

export function openAICompatibleProvider(options: CompatibleOptions) {
  return {
    name: options.name,
    model: options.model,
    configured: Boolean(options.apiKey),
    async generate(input: AIGenerateInput, signal?: AbortSignal): Promise<AIGenerateResult> {
      const started = Date.now();
      const userContent: unknown = input.attachments?.length ? [
        { type: "text", text: input.userPrompt },
        ...input.attachments.map(file => ({ type: "image_url", image_url: { url: `data:${file.mimeType};base64,${file.base64}` } })),
      ] : input.userPrompt;
      let response: Response;
      try {
        response = await fetch(options.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}`, ...options.extraHeaders },
          body: JSON.stringify({
            model: options.model,
            messages: [{ role: "system", content: input.systemPrompt }, { role: "user", content: userContent }],
            temperature: input.temperature ?? 0.2,
            max_tokens: input.maxTokens ?? 1200,
            ...(input.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
          }),
          signal,
        });
      } catch (error) { throw providerError(error); }
      const raw = await response.text();
      if (!response.ok) throw providerError(undefined, response.status, raw.slice(0, 500));
      let data: { choices?: Array<{ message?: { content?: unknown } }>; model?: string };
      try { data = JSON.parse(raw); } catch { throw new AIProviderError("MALFORMED", "Invalid provider JSON"); }
      const content = data.choices?.[0]?.message?.content;
      const text = typeof content === "string" ? content.trim() : "";
      if (!text) throw new AIProviderError("MALFORMED", "Missing provider text");
      const quotaRemaining = response.headers.get("x-ratelimit-remaining-requests") || response.headers.get("x-ratelimit-remaining-tokens") || undefined;
      return { text, provider: options.name, model: data.model || options.model, latencyMs: Date.now() - started, quotaRemaining };
    },
  };
}
