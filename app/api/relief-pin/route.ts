import { portalActor } from "../../server-auth";
import { changeReliefPin } from "../../lib/relief-pin";

export async function POST(request: Request) {
  const actor = await portalActor(request);
  if (!actor || !["admin", "super_admin"].includes(actor.role)) return Response.json({ error: "Akaun pentadbir diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null) as { currentPin?: unknown; newPin?: unknown } | null;
  if (!body) return Response.json({ error: "Maklumat PIN tidak sah." }, { status: 400 });
  const result = await changeReliefPin(body.currentPin, body.newPin, actor.email);
  return Response.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "private, no-store" } });
}
