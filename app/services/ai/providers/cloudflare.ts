import { openAICompatibleProvider } from "./shared";
export const cloudflareProvider = (model: string, accountId?: string, token?: string) => openAICompatibleProvider({ name: "cloudflare", model, apiKey: accountId && token ? token : undefined, endpoint: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId || "")}/ai/v1/chat/completions` });
