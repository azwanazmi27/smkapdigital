import type { AIErrorCategory } from "./errors";
import type { AIProviderName } from "./types";

export function logAI(event: { provider: AIProviderName; model: string; status: "started" | "success" | "failed" | "skipped"; latencyMs?: number; errorCategory?: AIErrorCategory }) {
  console.info("[AI]", JSON.stringify({ timestamp: new Date().toISOString(), ...event }));
}
