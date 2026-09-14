import type { AIProviderName } from "./types";

const supported: AIProviderName[] = ["gemini", "groq", "mistral", "openrouter", "cloudflare"];
const positiveInt = (value: string | undefined, fallback: number, max: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, max) : fallback;
};

export function getAIConfig(env: NodeJS.ProcessEnv = process.env) {
  const requested = (env.AI_PROVIDER_ORDER || supported.join(",")).split(",").map(v => v.trim().toLowerCase());
  const order = requested.filter((v, i): v is AIProviderName => supported.includes(v as AIProviderName) && requested.indexOf(v) === i);
  return {
    order: order.length ? order : supported,
    timeoutMs: positiveInt(env.AI_REQUEST_TIMEOUT_MS, 30_000, 60_000),
    maxRetries: positiveInt(env.AI_MAX_RETRIES_PER_PROVIDER, 1, 3),
    models: {
      gemini: env.GEMINI_MODEL || "gemini-3.6-flash",
      groq: env.GROQ_MODEL || "openai/gpt-oss-20b",
      mistral: env.MISTRAL_MODEL || "mistral-small-latest",
      openrouter: env.OPENROUTER_MODEL || "openai/gpt-oss-20b",
      cloudflare: env.CLOUDFLARE_MODEL || "@cf/zai-org/glm-4.7-flash",
    },
  };
}
