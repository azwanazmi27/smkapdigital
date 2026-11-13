import { portalActor } from "../../../server-auth";
import { currentPbdVersion, pbdAccess, PBD_MAX_BYTES, readPbdSnapshot, writePbdSnapshot } from "../../../lib/dashboard-pbd";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const actor = await portalActor(request);
    if (!actor) return Response.json({ error: "Sila log masuk." }, { status: 401, headers });
    const access = await pbdAccess(actor);
    if (!access.canView) return Response.json({ error: "Akses tidak dibenarkan." }, { status: 403, headers });
    const snapshot = await readPbdSnapshot();
    return Response.json({ ...snapshot, canEdit: access.canEdit }, { headers });
  } catch (error) {
    console.error("Dashboard PBD read", error);
    return Response.json({ error: "Data Dashboard PBD tidak dapat dibaca sekarang." }, { status: 500, headers });
  }
}

export async function PUT(request: Request) {
  if (new URL(request.url).origin !== request.headers.get("origin")) return Response.json({ error: "Permintaan tidak sah." }, { status: 403, headers });
  try {
    const actor = await portalActor(request);
    if (!actor) return Response.json({ error: "Sila log masuk." }, { status: 401, headers });
    const access = await pbdAccess(actor);
    if (!access.canEdit) return Response.json({ error: "Hanya pentadbir Dashboard PBD boleh menyimpan perubahan." }, { status: 403, headers });
    const length = Number(request.headers.get("content-length") || 0);
    if (length > PBD_MAX_BYTES) return Response.json({ error: "Data terlalu besar untuk disimpan." }, { status: 413, headers });
    const body = await request.json() as { baseVersion?: unknown; data?: unknown };
    if (typeof body.data !== "string" || body.data.length > PBD_MAX_BYTES) return Response.json({ error: "Data tidak sah." }, { status: 400, headers });
    let parsed: unknown;
    try { parsed = JSON.parse(body.data); } catch { return Response.json({ error: "Data tidak sah." }, { status: 400, headers }); }
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { sets?: unknown }).sets)) return Response.json({ error: "Format data Dashboard PBD tidak sah." }, { status: 400, headers });
    const current = await currentPbdVersion();
    if (body.baseVersion !== "*" && current && body.baseVersion !== current) {
      const latest = await readPbdSnapshot();
      return Response.json({ error: "Data telah dikemas kini oleh pengguna lain.", version: latest.version, updatedAt: latest.updatedAt, updatedBy: latest.updatedBy }, { status: 409, headers });
    }
    const saved = await writePbdSnapshot(body.data, actor);
    return Response.json({ success: true, ...saved }, { headers });
  } catch (error) {
    console.error("Dashboard PBD save", error);
    return Response.json({ error: "Data tidak dapat disimpan sekarang." }, { status: 500, headers });
  }
}
