import { env } from "cloudflare:workers";
import type { PortalActor } from "../server-auth";
import { aksesWarga } from "../dashboard-pbd-access";

// Dashboard PBD: satu salinan data dikongsi untuk seluruh sekolah, disimpan dalam R2.
export const PBD_DATA_KEY = "dashboard-pbd/data.json";
export const PBD_HISTORY_PREFIX = "dashboard-pbd/history/";
export const PBD_HISTORY_KEEP = 20;
export const PBD_MAX_BYTES = 25_000_000;
export const PBD_STORAGE_KEY = "dashboardPBD_v1";

export type PbdAccess = { canView: boolean; canEdit: boolean; canManage: boolean };

// Sama seperti Dashboard SPM: setiap warga boleh edit, lihat sahaja atau tiada akses (lalai: lihat sahaja).
// Super Admin, dan Admin yang diberi modul "Dashboard PBD" dalam tab Akses Admin, sentiasa boleh edit dan mengurus akses.
export async function pbdAccess(actor: PortalActor | null): Promise<PbdAccess> {
  if (!actor) return { canView: false, canEdit: false, canManage: false };
  const akses = await aksesWarga(env.DB, actor);
  return { canView: akses.tahap !== "none", canEdit: akses.tahap === "edit", canManage: akses.urus };
}

export type PbdSnapshot = { data: string | null; version: string; updatedAt: string; updatedBy: string };

export async function readPbdSnapshot(): Promise<PbdSnapshot> {
  const object = await env.FILES.get(PBD_DATA_KEY);
  if (!object) return { data: null, version: "", updatedAt: "", updatedBy: "" };
  const meta = object.customMetadata || {};
  return { data: await object.text(), version: meta.version || object.etag, updatedAt: meta.updatedAt || object.uploaded.toISOString(), updatedBy: meta.updatedBy || "" };
}

export async function currentPbdVersion() {
  const head = await env.FILES.head(PBD_DATA_KEY);
  return head ? head.customMetadata?.version || head.etag : "";
}

export async function writePbdSnapshot(data: string, actor: PortalActor) {
  const previous = await env.FILES.get(PBD_DATA_KEY);
  const now = new Date().toISOString();
  if (previous) {
    // Simpan salinan versi sebelum ini supaya data boleh dipulihkan jika tersilap padam.
    await env.FILES.put(`${PBD_HISTORY_PREFIX}${now.replace(/[:.]/g, "-")}.json`, previous.body, { httpMetadata: { contentType: "application/json" }, customMetadata: previous.customMetadata || {} });
    const listed = await env.FILES.list({ prefix: PBD_HISTORY_PREFIX });
    const old = listed.objects.map((item) => item.key).sort().reverse().slice(PBD_HISTORY_KEEP);
    if (old.length) await env.FILES.delete(old);
  }
  const version = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  await env.FILES.put(PBD_DATA_KEY, data, { httpMetadata: { contentType: "application/json" }, customMetadata: { version, updatedAt: now, updatedBy: actor.email } });
  try {
    await env.DB.prepare("INSERT INTO admin_audit_logs(id,actor_email,action,target_email,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(), actor.email, "dashboard_pbd_save", `${Math.round(data.length / 1024)} KB`, now).run();
  } catch { /* log aktiviti adalah pilihan */ }
  return { version, updatedAt: now, updatedBy: actor.email };
}

// JSON dalam <script> mesti selamat daripada penutup tag dan pemisah baris JS.
export function inlineJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
