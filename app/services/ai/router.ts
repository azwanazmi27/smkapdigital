import { getAIConfig } from "./config";
import { AIProviderError, AIUnavailableError, isTransient, providerError } from "./errors";
import { logAI } from "./logger";
import { cloudflareProvider } from "./providers/cloudflare";
import { geminiProvider } from "./providers/gemini";
import { groqProvider } from "./providers/groq";
import { mistralProvider } from "./providers/mistral";
import { openRouterProvider } from "./providers/openrouter";
import type { AIGenerateInput, AIGenerateResult, AIProvider, AIProviderName } from "./types";
import { recordFailure, recordSuccess } from "./status";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function configuredProviders(env: NodeJS.ProcessEnv = process.env): Record<AIProviderName, AIProvider> {
  const config = getAIConfig(env);
  return {
    gemini: geminiProvider(config.models.gemini, env.GEMINI_API_KEY),
    groq: groqProvider(config.models.groq, env.GROQ_API_KEY),
    mistral: mistralProvider(config.models.mistral, env.MISTRAL_API_KEY),
    openrouter: openRouterProvider(config.models.openrouter, env.OPENROUTER_API_KEY),
    cloudflare: cloudflareProvider(config.models.cloudflare, env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN),
  };
}

export async function generateAI(input: AIGenerateInput, options: { env?: NodeJS.ProcessEnv; providers?: Partial<Record<AIProviderName, AIProvider>>; random?: () => number } = {}): Promise<AIGenerateResult> {
  const env = options.env || process.env, config = getAIConfig(env), providers = options.providers || configuredProviders(env), random = options.random || Math.random;
  let providersAttempted = 0;
  for (const name of config.order) {
    const provider = providers[name];
    if (!provider?.configured) { if (provider) logAI({ provider: name, model: provider.model, status: "skipped" }); continue; }
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const started = Date.now(); logAI({ provider: name, model: provider.model, status: "started" });
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new AIProviderError("TIMEOUT", "Provider timed out", 408)); }, config.timeoutMs); });
      try {
        providersAttempted++;
        const result = await Promise.race([provider.generate(input, controller.signal), timeout]);
        clearTimeout(timer!);
        if (!result.text.trim()) throw new AIProviderError("MALFORMED", "Empty response");
        if (input.responseFormat === "json") {
          try { JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()); }
          catch { throw new AIProviderError("MALFORMED", "Invalid structured response"); }
        }
        logAI({ provider: name, model: result.model, status: "success", latencyMs: result.latencyMs }); recordSuccess(result, providersAttempted > 1); return result;
      } catch (unknownError) {
        clearTimeout(timer!);
        const error = providerError(unknownError); logAI({ provider: name, model: provider.model, status: "failed", latencyMs: Date.now() - started, errorCategory: error.category }); recordFailure(name, error.category);
        if (attempt < config.maxRetries && isTransient(error)) await delay(Math.min(250 * 2 ** attempt + Math.floor(random() * 150), 1500));
        else break;
      }
    }
  }
  throw new AIUnavailableError();
}
