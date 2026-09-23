import { AIProviderError, providerError } from "../errors";
import type { AIGenerateInput, AIGenerateResult } from "../types";

export function geminiProvider(model: string, apiKey?: string) {
  return { name: "gemini" as const, model, configured: Boolean(apiKey), async generate(input: AIGenerateInput, signal?: AbortSignal): Promise<AIGenerateResult> {
    const started = Date.now();
    // Gemini 3 counts thinking tokens against maxOutputTokens. Short JSON
    // responses can otherwise finish at MAX_TOKENS without any visible text.
    const structuredGemini3 = input.responseFormat === "json" && /^gemini-3(?:\.|-)/.test(model);
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey || "" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: input.systemPrompt }] }, contents: [{ role: "user", parts: [
          { text: input.userPrompt }, ...(input.attachments || []).map(file => ({ inlineData: { mimeType: file.mimeType, data: file.base64 } })),
        ] }], generationConfig: { temperature: input.temperature ?? 0.2, maxOutputTokens: structuredGemini3 ? Math.max(input.maxTokens ?? 1200, 4096) : input.maxTokens ?? 1200, ...(structuredGemini3 ? { thinkingConfig: { thinkingLevel: "low" } } : {}), ...(input.responseFormat === "json" ? { responseMimeType: "application/json" } : {}) } }), signal,
      });
    } catch (error) { throw providerError(error); }
    const raw = await response.text();
    if (!response.ok) throw providerError(undefined, response.status, raw.slice(0, 500));
    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    try { data = JSON.parse(raw); } catch { throw new AIProviderError("MALFORMED", "Invalid Gemini JSON"); }
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "";
    if (!text) throw new AIProviderError("MALFORMED", "Missing Gemini text");
    return { text, provider: "gemini", model, latencyMs: Date.now() - started };
  }};
}
