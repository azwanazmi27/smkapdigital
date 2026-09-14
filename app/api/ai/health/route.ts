import { portalActor } from "../../../server-auth";
import { getAIConfig } from "../../../services/ai/config";
import { configuredProviders } from "../../../services/ai/router";
import { statusSnapshot } from "../../../services/ai/status";

export async function GET(request: Request) {
  const config = getAIConfig(), providers = configuredProviders(), runtime = statusSnapshot(), basic = Object.fromEntries(config.order.map(name => [name, providers[name].configured && !(runtime.providers[name] as {lastErrorCategory?:string}|undefined)?.lastErrorCategory ? "online" : "offline"]));
  if (new URL(request.url).searchParams.get("detail") !== "1") return Response.json({ providers: basic });
  const actor = await portalActor(request);
  if (!actor || !["admin", "super_admin"].includes(actor.role)) return Response.json({ error: "Akses pentadbir diperlukan." }, { status: 403 });
  return Response.json({ order: config.order, timeoutMs: config.timeoutMs, maxRetries: config.maxRetries, fallbackCount: runtime.fallbackCount, providers: Object.fromEntries(config.order.map(name => { const details = runtime.providers[name] as Record<string, unknown> | undefined; return [name, { status: basic[name], model: providers[name].model, reason: providers[name].configured ? details?.lastErrorCategory || null : "API_KEY_MISSING", quotaRemaining: details?.quotaRemaining || "Tidak dilaporkan oleh provider", successes: details?.successes || 0, failures: details?.failures || 0, averageLatencyMs: details?.averageLatencyMs || null, lastSuccessAt: details?.lastSuccessAt || null, lastFailureAt: details?.lastFailureAt || null }]; })) });
}
