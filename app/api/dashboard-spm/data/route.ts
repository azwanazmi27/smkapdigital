import { env } from "cloudflare:workers";
import { portalActor } from "../../../server-auth";
import { aksesWarga, bacaData, dataSah, HAD_DATA, pulihData, sejarahData, simpanData } from "../../../dashboard-spm-store";

// Data Dashboard SPM sekolah (satu set dikongsi). GET: semua yang dibenarkan melihat. PUT: tahap edit sahaja, dengan versi asas
// (pengepala X-DSPM-Versi) supaya simpanan serentak tidak menimpa data orang lain. GET ?view=sejarah dan POST {pulih}: pengurus.
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const sameOrigin = (request: Request) => new URL(request.url).origin === request.headers.get("origin");

export async function GET(request: Request) {
  const actor = await portalActor(request);
  if (!actor) return reply({ error: "Sila log masuk." }, 401);
  const akses = await aksesWarga(env.DB, actor);
  if (akses.tahap === "none") return reply({ error: "Akaun anda tiada akses Dashboard SPM." }, 403);
  if (new URL(request.url).searchParams.get("view") === "sejarah") {
    if (!akses.urus) return reply({ error: "Hanya pentadbir Dashboard SPM boleh melihat sejarah." }, 403);
    return reply({ sejarah: await sejarahData(env.DB) });
  }
  const d = await bacaData(env.DB, env.FILES);
  if (d.rosak) return reply({ error: "Data Dashboard SPM tidak dapat dibaca. Hubungi pentadbir portal." }, 500);
  const tag = `"dspm-data-${d.versi}-${akses.tahap}-${akses.urus ? 1 : 0}"`;
  const headers = {
    "Cache-Control": "private, no-cache", ETag: tag,
    "X-DSPM-Versi": String(d.versi), "X-DSPM-Tahap": akses.tahap, "X-DSPM-Urus": akses.urus ? "1" : "0",
    "X-DSPM-Oleh": encodeURIComponent(d.oleh), "X-DSPM-Pada": d.pada,
  };
  if ((request.headers.get("if-none-match") || "").split(",").map((v) => v.trim().replace(/^W\//, "")).includes(tag)) {
    d.body?.cancel();
    return new Response(null, { status: 304, headers });
  }
  return new Response(d.body ?? "null", { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Permintaan tidak sah." }, 403);
  const actor = await portalActor(request);
  if (!actor) return reply({ error: "Sila log masuk." }, 401);
  if ((await aksesWarga(env.DB, actor)).tahap !== "edit") return reply({ error: "Anda hanya boleh melihat Dashboard SPM." }, 403);
  const asas = Number(request.headers.get("x-dspm-versi"));
  if (!Number.isInteger(asas) || asas < 0) return reply({ error: "Versi data tidak sah." }, 400);
  if (Number(request.headers.get("content-length") || 0) > HAD_DATA) return reply({ error: "Data terlalu besar." }, 413);
  const teks = await request.text();
  if (teks.length > HAD_DATA) return reply({ error: "Data terlalu besar." }, 413);
  if (!dataSah(teks)) return reply({ error: "Format data tidak sah." }, 400);
  const r = await simpanData(env.DB, env.FILES, actor, teks, asas);
  if ("konflik" in r) return reply({ konflik: true, ...r.konflik }, 409);
  return reply(r);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Permintaan tidak sah." }, 403);
  const actor = await portalActor(request);
  if (!actor) return reply({ error: "Sila log masuk." }, 401);
  if (!(await aksesWarga(env.DB, actor)).urus) return reply({ error: "Hanya pentadbir Dashboard SPM boleh memulihkan versi lama." }, 403);
  const body = await request.json().catch(() => ({})) as { pulih?: unknown };
  const versi = Number(body.pulih);
  if (!Number.isInteger(versi) || versi < 1) return reply({ error: "Versi tidak sah." }, 400);
  const r = await pulihData(env.DB, env.FILES, actor, versi);
  if ("tiada" in r) return reply({ error: "Versi itu tidak lagi disimpan." }, 404);
  if ("konflik" in r) return reply({ konflik: true, ...r.konflik }, 409);
  return reply(r);
}
