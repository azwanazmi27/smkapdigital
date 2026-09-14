export type AIErrorCategory = "TIMEOUT" | "RATE_LIMIT" | "QUOTA" | "NETWORK" | "SERVER" | "AUTH" | "BAD_REQUEST" | "MALFORMED" | "UNKNOWN";

export class AIProviderError extends Error {
  constructor(public category: AIErrorCategory, message: string, public status?: number) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIUnavailableError extends Error {
  constructor() {
    super("Perkhidmatan AI sedang mengalami gangguan sementara. Sila cuba semula.");
    this.name = "AIUnavailableError";
  }
}

export function providerError(error: unknown, status?: number, detail = "") {
  if (error instanceof AIProviderError) return error;
  const message = `${error instanceof Error ? error.message : String(error)} ${detail}`.toLowerCase();
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return new AIProviderError("TIMEOUT", "Provider timed out", 408);
  if (status === 408) return new AIProviderError("TIMEOUT", "Provider timed out", status);
  if (status === 429) return new AIProviderError(message.includes("quota") ? "QUOTA" : "RATE_LIMIT", "Provider capacity unavailable", status);
  if ([500, 502, 503, 504].includes(status || 0)) return new AIProviderError("SERVER", "Provider service unavailable", status);
  if (status === 401 || status === 403) return new AIProviderError("AUTH", "Provider authentication failed", status);
  if (status === 400) return new AIProviderError("BAD_REQUEST", "Provider rejected request", status);
  if (message.includes("quota")) return new AIProviderError("QUOTA", "Provider quota exhausted", status);
  if (message.includes("network") || message.includes("fetch")) return new AIProviderError("NETWORK", "Provider network error", status);
  return new AIProviderError("UNKNOWN", "Provider request failed", status);
}

export function isTransient(error: AIProviderError) {
  return ["TIMEOUT", "RATE_LIMIT", "QUOTA", "NETWORK", "SERVER"].includes(error.category);
}
