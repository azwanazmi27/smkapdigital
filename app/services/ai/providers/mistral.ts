import { openAICompatibleProvider } from "./shared";
export const mistralProvider = (model: string, apiKey?: string) => openAICompatibleProvider({ name: "mistral", model, apiKey, endpoint: "https://api.mistral.ai/v1/chat/completions" });
