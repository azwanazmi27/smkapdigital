import test from "node:test";
import assert from "node:assert/strict";
import { geminiProvider } from "../app/services/ai/providers/gemini.ts";

test("Gemini 3 JSON leaves room for thinking tokens without changing other models", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
  };
  try {
    const input = { systemPrompt: "test", userPrompt: "test", responseFormat: "json", maxTokens: 1200 };
    await geminiProvider("gemini-3.5-flash", "test-key").generate(input);
    await geminiProvider("gemini-2.5-flash", "test-key").generate(input);
    assert.equal(requests[0].generationConfig.maxOutputTokens, 4096);
    assert.deepEqual(requests[0].generationConfig.thinkingConfig, { thinkingLevel: "low" });
    assert.equal(requests[1].generationConfig.maxOutputTokens, 1200);
    assert.equal(requests[1].generationConfig.thinkingConfig, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
