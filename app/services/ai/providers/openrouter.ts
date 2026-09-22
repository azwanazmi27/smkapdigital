import { openAICompatibleProvider } from "./shared";
export const openRouterProvider = (model: string, apiKey?: string) => openAICompatibleProvider({ name: "openrouter", model, apiKey, endpoint: "https://openrouter.ai/api/v1/chat/completions", extraHeaders: { "HTTP-Referer": "https://portal.smkapdigital.workers.dev", "X-Title": "Portal Rasmi SMK Agama Pahang" } });
