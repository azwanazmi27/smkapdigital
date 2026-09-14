import type { AIErrorCategory } from "./errors";
import type { AIGenerateResult, AIProviderName } from "./types";

type ProviderStatus = { successes: number; failures: number; lastSuccessAt?: string; lastFailureAt?: string; lastErrorCategory?: AIErrorCategory; latencyTotalMs: number; quotaRemaining?: string };
const state = new Map<AIProviderName, ProviderStatus>();
let fallbackCount = 0;

const current = (provider: AIProviderName) => state.get(provider) || { successes: 0, failures: 0, latencyTotalMs: 0 };
export function recordSuccess(result: AIGenerateResult, wasFallback: boolean) { const value = current(result.provider); value.successes++; value.latencyTotalMs += result.latencyMs; value.lastSuccessAt = new Date().toISOString(); value.lastErrorCategory = undefined; if (result.quotaRemaining) value.quotaRemaining = result.quotaRemaining; state.set(result.provider, value); if (wasFallback) fallbackCount++; }
export function recordFailure(provider: AIProviderName, category: AIErrorCategory) { const value = current(provider); value.failures++; value.lastFailureAt = new Date().toISOString(); value.lastErrorCategory = category; state.set(provider, value); }
export function statusSnapshot() { return { fallbackCount, providers: Object.fromEntries([...state].map(([name, value]) => [name, { ...value, averageLatencyMs: value.successes ? Math.round(value.latencyTotalMs / value.successes) : null }])) }; }
