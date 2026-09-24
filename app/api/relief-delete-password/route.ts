import { portalActor } from "../../server-auth";
import { deletePasswordStatus, setDeletePassword } from "../../lib/relief-delete-password";

const noStore = { "Cache-Control": "private, no-store" };
const admin = async (request: Request) => {
  const actor = await portalActor(request);
  return actor && ["admin", "super_admin"].includes(actor.role) ? actor : null;
};

export async function GET(request: Request) {
  if (!await admin(request)) return Response.json({ error: "Akaun pentadbir diperlukan." }, { status: 403, headers: noStore });
  return Response.json(await deletePasswordStatus(), { headers: noStore });
}

export async function POST(request: Request) {
  const actor = await admin(request);
  if (!actor) return Response.json({ error: "Akaun pentadbir diperlukan." }, { status: 403, headers: noStore });
  const body = await request.json().catch(() => null) as { kind?: unknown; password?: unknown } | null;
  if (!body) return Response.json({ error: "Maklumat kata laluan tidak sah." }, { status: 400, headers: noStore });
  const result = await setDeletePassword(body.kind, body.password, actor.email);
  return Response.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : 400, headers: noStore });
}
