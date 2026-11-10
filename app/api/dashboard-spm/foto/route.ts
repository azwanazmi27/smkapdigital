import { env } from "cloudflare:workers";
import { portalActor } from "../../../server-auth";
import { aksesWarga, bacaData, fotoSah, HAD_FOTO, simpanFoto } from "../../../dashboard-spm-store";

// Gambar calon Dashboard SPM: satu objek JSON {kunci calon: data URL}. GET: semua yang dibenarkan melihat. PUT: tahap edit.
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const actor = await portalActor(request);
  if (!actor) return reply({ error: "Sila log masuk." }, 401);
  if ((await aksesWarga(env.DB, actor)).tahap === "none") return reply({ error: "Akaun anda tiada akses Dashboard SPM." }, 403);
  const d = await bacaData(env.DB, env.FILES, "foto");
  if (d.rosak) return reply({ error: "Gambar calon tidak dapat dibaca." }, 500);
  const tag = `"dspm-foto-${d.versi}"`, headers = { "Cache-Control": "private, no-cache", ETag: tag, "X-DSPM-Versi": String(d.versi) };
  if ((request.headers.get("if-none-match") || "").split(",").map((v) => v.trim().replace(/^W\//, "")).includes(tag)) {
    d.body?.cancel();
    return new Response(null, { status: 304, headers });
  }
  return new Response(d.body ?? "{}", { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

export async function PUT(request: Request) {
  if (new URL(request.url).origin !== request.headers.get("origin")) return reply({ error: "Permintaan tidak sah." }, 403);
  const actor = await portalActor(request);
  if (!actor) return reply({ error: "Sila log masuk." }, 401);
  if ((await aksesWarga(env.DB, actor)).tahap !== "edit") return reply({ error: "Anda hanya boleh melihat Dashboard SPM." }, 403);
  if (Number(request.headers.get("content-length") || 0) > HAD_FOTO) return reply({ error: "Gambar terlalu besar." }, 413);
  const teks = await request.text();
  if (!fotoSah(teks)) return reply({ error: "Format gambar tidak sah atau terlalu besar." }, 400);
  return reply(await simpanFoto(env.DB, env.FILES, actor, teks));
}
