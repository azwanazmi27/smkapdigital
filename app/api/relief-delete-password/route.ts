import { portalActor } from "../../server-auth";
import { changeReliefDeletePassword, initializeReliefDeletePassword, reliefDeletePasswordConfigured } from "../../lib/relief-delete-password";

export async function GET(request: Request) {
  const actor = await portalActor(request);
  if (!actor || !["admin", "super_admin"].includes(actor.role)) return Response.json({ error: "Akaun pentadbir diperlukan." }, { status: 403 });
  return Response.json({ configured: await reliefDeletePasswordConfigured(), canInitialize: actor.role === "super_admin" }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const actor = await portalActor(request);
  if (!actor || !["admin", "super_admin"].includes(actor.role)) return Response.json({ error: "Akaun pentadbir diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  if (!body) return Response.json({ error: "Maklumat kata laluan tidak sah." }, { status: 400 });
  const configured = await reliefDeletePasswordConfigured();
  if (!configured && actor.role !== "super_admin") return Response.json({ error: "Pentadbir utama perlu menetapkan kata laluan dahulu." }, { status: 403 });
  const result = configured
    ? await changeReliefDeletePassword(body.currentPassword, body.newPassword, actor.email)
    : await initializeReliefDeletePassword(body.newPassword, actor.email);
  return Response.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "private, no-store" } });
}
