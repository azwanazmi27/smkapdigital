import { env } from "cloudflare:workers";
import { portalActor } from "../../../server-auth";
import { aksesWarga, senaraiAkses, tahapSah, tetapAkses, tetapLalai } from "../../../dashboard-spm-store";

// Tahap akses Dashboard SPM setiap warga: edit, lihat sahaja atau tiada akses (tanpa tetapan = ikut lalai).
// Hanya pengurus: Super Admin, atau Admin yang diberi modul "Dashboard SPM" dalam tab Akses Admin portal.
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function pengurus(request: Request) {
  const actor = await portalActor(request);
  if (!actor) return { error: reply({ error: "Sila log masuk." }, 401) };
  if (!(await aksesWarga(env.DB, actor)).urus) return { error: reply({ error: "Hanya pentadbir Dashboard SPM boleh menetapkan akses." }, 403) };
  return { actor };
}

export async function GET(request: Request) {
  const p = await pengurus(request);
  if (p.error) return p.error;
  return reply(await senaraiAkses(env.DB));
}

export async function PUT(request: Request) {
  if (new URL(request.url).origin !== request.headers.get("origin")) return reply({ error: "Permintaan tidak sah." }, 403);
  const p = await pengurus(request);
  if (p.error) return p.error;
  const b = await request.json().catch(() => ({})) as { userId?: unknown; tahap?: unknown; lalai?: unknown };
  if (b.lalai !== undefined) {
    if (b.lalai !== "view" && b.lalai !== "none") return reply({ error: "Tahap lalai tidak sah." }, 400);
    await tetapLalai(env.DB, b.lalai);
    return reply(await senaraiAkses(env.DB));
  }
  if (typeof b.userId !== "string" || !(b.tahap === null || tahapSah(b.tahap))) return reply({ error: "Permintaan tidak sah." }, 400);
  if (!await tetapAkses(env.DB, p.actor, b.userId.slice(0, 120), b.tahap)) return reply({ error: "Warga tidak ditemui." }, 404);
  return reply(await senaraiAkses(env.DB));
}
