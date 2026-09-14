import { openAICompatibleProvider } from "./shared";
export const groqProvider = (model: string, apiKey?: string) => openAICompatibleProvider({ name: "groq", model, apiKey, endpoint: "https://api.groq.com/openai/v1/chat/completions" });
