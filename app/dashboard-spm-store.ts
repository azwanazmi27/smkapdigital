// Dashboard SPM dalam portal: satu set data sekolah dikongsi oleh semua warga yang dibenarkan.
// Data (JSON format padat Dashboard SPM) disimpan dalam R2. D1 menyimpan versi semasa, sejarah 30 versi dan tahap akses.
// Setiap simpanan membawa versi asas; jika orang lain sudah menyimpan dahulu, simpanan ditolak (konflik) supaya tiada data tertimpa.
// Modul ini tidak bergantung pada cloudflare:workers supaya boleh diuji dengan D1 dan R2 tiruan.

export type Tahap = "edit" | "view" | "none";
export type Akses = { tahap: Tahap; urus: boolean };
type Pelaku = { id: string; name: string; role: string };
type Stmt = { bind(...v: unknown[]): Stmt; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<{ meta?: { changes?: number } }> };
export type Db = { prepare(sql: string): Stmt; batch(list: Stmt[]): Promise<unknown> };
type Objek = { body: ReadableStream | null; text(): Promise<string> };
export type Fail = { put(key: string, value: string, opt?: unknown): Promise<unknown>; get(key: string): Promise<Objek | null>; delete(key: string | string[]): Promise<unknown> };

export const HAD_DATA = 15 * 1024 * 1024;
export const HAD_FOTO = 40 * 1024 * 1024;
export const SIMPAN_VERSI = 30;
const TAHAP = new Set<Tahap>(["edit", "view", "none"]);
export const tahapSah = (v: unknown): v is Tahap => typeof v === "string" && TAHAP.has(v as Tahap);

let siap: Promise<unknown> | undefined;
export function sediakan(db: Db) {
  return siap ??= db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS dashboard_spm_state (id TEXT PRIMARY KEY,version INTEGER NOT NULL,data_key TEXT NOT NULL,size INTEGER NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL,updated_name TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS dashboard_spm_versions (version INTEGER PRIMARY KEY,data_key TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL,user_id TEXT NOT NULL,user_name TEXT NOT NULL,note TEXT NOT NULL DEFAULT '')"),
    db.prepare("CREATE TABLE IF NOT EXISTS dashboard_spm_access (user_id TEXT PRIMARY KEY,level TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS dashboard_spm_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)"),
  ]).catch((e) => { siap = undefined; throw e; });
}
// Untuk ujian: mulakan semula selepas pangkalan data tiruan baharu.
export const setSemula = () => { siap = undefined; };

// Pengurus: Super Admin, atau Admin yang diberi modul "Dashboard SPM" dalam tab Akses Admin portal.
async function adminDiberi(db: Db, id: string) {
  try { return !!await db.prepare("SELECT user_id FROM admin_module_permissions WHERE user_id=? AND module_key='dashboardspm' AND enabled=1").bind(id).first(); }
  catch { return false; } // jadual belum wujud: belum ada Admin diberi modul ini
}
export async function tahapLalai(db: Db): Promise<Tahap> {
  const r = await db.prepare("SELECT value FROM dashboard_spm_settings WHERE key='default_level'").first<{ value: string }>();
  return r && (r.value === "view" || r.value === "none") ? r.value : "view";
}
export async function aksesWarga(db: Db, p: Pelaku): Promise<Akses> {
  await sediakan(db);
  const urus = p.role === "super_admin" || (p.role === "admin" && await adminDiberi(db, p.id));
  if (urus) return { tahap: "edit", urus: true };
  const r = await db.prepare("SELECT level FROM dashboard_spm_access WHERE user_id=?").bind(p.id).first<{ level: string }>();
  return { tahap: r && tahapSah(r.level) ? r.level : await tahapLalai(db), urus: false };
}

// Semakan ringan tanpa JSON.parse (jimat CPU Worker): mesti objek format padat v2 dengan senarai rek.
export const dataSah = (t: string) => t.length > 0 && t.length <= HAD_DATA && t.startsWith("{") && t.endsWith("}") && t.includes('"rek":[') && t.includes('"_v":2');
export const fotoSah = (t: string) => t.length > 0 && t.length <= HAD_FOTO && t.startsWith("{") && t.endsWith("}");

type Meta = { versi: number; oleh: string; pada: string };
async function meta(db: Db, id: "data" | "foto"): Promise<Meta & { kunci: string }> {
  const s = await db.prepare("SELECT version,data_key,updated_at,updated_name FROM dashboard_spm_state WHERE id=?").bind(id).first<{ version: number; data_key: string; updated_at: string; updated_name: string }>();
  return s ? { versi: Number(s.version), kunci: s.data_key, oleh: s.updated_name, pada: s.updated_at } : { versi: 0, kunci: "", oleh: "", pada: "" };
}
export async function bacaData(db: Db, fail: Fail, id: "data" | "foto" = "data") {
  await sediakan(db);
  const m = await meta(db, id);
  if (!m.versi) return { versi: 0, oleh: "", pada: "", body: null as ReadableStream | null, rosak: false };
  const o = await fail.get(m.kunci);
  return { versi: m.versi, oleh: m.oleh, pada: m.pada, body: o ? o.body : null, rosak: !o };
}

export async function simpanData(db: Db, fail: Fail, p: Pelaku, teks: string, asas: number, nota = "") {
  await sediakan(db);
  const semasa = await meta(db, "data");
  if (asas !== semasa.versi) return { konflik: { versi: semasa.versi, oleh: semasa.oleh, pada: semasa.pada } };
  const versi = semasa.versi + 1, kunci = `dashboard-spm/data/v${versi}-${crypto.randomUUID()}.json`, pada = new Date().toISOString(), saiz = teks.length;
  await fail.put(kunci, teks, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
  const r = semasa.versi === 0
    ? await db.prepare("INSERT INTO dashboard_spm_state(id,version,data_key,size,updated_at,updated_by,updated_name) VALUES('data',?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(versi, kunci, saiz, pada, p.id, p.name).run()
    : await db.prepare("UPDATE dashboard_spm_state SET version=?,data_key=?,size=?,updated_at=?,updated_by=?,updated_name=? WHERE id='data' AND version=?").bind(versi, kunci, saiz, pada, p.id, p.name, semasa.versi).run();
  if (!r.meta?.changes) {
    await fail.delete(kunci);
    const kini = await meta(db, "data");
    return { konflik: { versi: kini.versi, oleh: kini.oleh, pada: kini.pada } };
  }
  await db.prepare("INSERT OR REPLACE INTO dashboard_spm_versions(version,data_key,size,created_at,user_id,user_name,note) VALUES(?,?,?,?,?,?,?)").bind(versi, kunci, saiz, pada, p.id, p.name, nota).run();
  const lama = await db.prepare("SELECT version,data_key FROM dashboard_spm_versions ORDER BY version DESC LIMIT -1 OFFSET ?").bind(SIMPAN_VERSI).all<{ version: number; data_key: string }>();
  if (lama.results.length) {
    await fail.delete(lama.results.map((x) => x.data_key));
    await db.prepare("DELETE FROM dashboard_spm_versions WHERE version<=?").bind(lama.results[0].version).run();
  }
  return { versi, pada, oleh: p.name };
}

export async function sejarahData(db: Db) {
  await sediakan(db);
  const r = await db.prepare("SELECT version,size,created_at,user_name,note FROM dashboard_spm_versions ORDER BY version DESC LIMIT ?").bind(SIMPAN_VERSI).all<{ version: number; size: number; created_at: string; user_name: string; note: string }>();
  return r.results.map((x) => ({ versi: Number(x.version), saiz: Number(x.size), pada: x.created_at, oleh: x.user_name, nota: x.note }));
}
// Pulihkan versi lama sebagai versi baharu (sejarah tidak dipadam, jadi pemulihan pun boleh dibatalkan).
export async function pulihData(db: Db, fail: Fail, p: Pelaku, versi: number) {
  await sediakan(db);
  const v = await db.prepare("SELECT data_key FROM dashboard_spm_versions WHERE version=?").bind(versi).first<{ data_key: string }>();
  if (!v) return { tiada: true as const };
  const o = await fail.get(v.data_key);
  if (!o) return { tiada: true as const };
  const semasa = await meta(db, "data");
  return simpanData(db, fail, p, await o.text(), semasa.versi, `Dipulihkan daripada versi ${versi}`);
}

// Gambar calon: satu objek JSON {kunci: dataURL}. Tanpa sejarah; simpanan terakhir diguna.
export async function simpanFoto(db: Db, fail: Fail, p: Pelaku, teks: string) {
  await sediakan(db);
  const semasa = await meta(db, "foto"), versi = semasa.versi + 1, kunci = `dashboard-spm/foto/v${versi}-${crypto.randomUUID()}.json`, pada = new Date().toISOString();
  await fail.put(kunci, teks, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
  await db.prepare("INSERT INTO dashboard_spm_state(id,version,data_key,size,updated_at,updated_by,updated_name) VALUES('foto',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,data_key=excluded.data_key,size=excluded.size,updated_at=excluded.updated_at,updated_by=excluded.updated_by,updated_name=excluded.updated_name").bind(versi, kunci, teks.length, pada, p.id, p.name).run();
  if (semasa.kunci) await fail.delete(semasa.kunci);
  return { versi, pada };
}

// Senarai akses untuk pengurus: semua warga aktif, tahap masing-masing (null = ikut lalai) dan siapa pengurus.
export async function senaraiAkses(db: Db) {
  await sediakan(db);
  const lalai = await tahapLalai(db);
  const w = await db.prepare("SELECT u.id,u.name,u.position,u.role,a.level FROM portal_users u LEFT JOIN dashboard_spm_access a ON a.user_id=u.id WHERE u.status='active' AND u.deleted_at IS NULL ORDER BY u.name").all<{ id: string; name: string; position: string; role: string; level: string | null }>();
  let diberi = new Set<string>();
  try { diberi = new Set((await db.prepare("SELECT user_id FROM admin_module_permissions WHERE module_key='dashboardspm' AND enabled=1").all<{ user_id: string }>()).results.map((x) => x.user_id)); } catch { /* jadual belum wujud */ }
  return { lalai, warga: w.results.map((u) => ({ id: u.id, nama: u.name, jawatan: u.position || "", tahap: tahapSah(u.level) ? u.level : null, urus: u.role === "super_admin" || (u.role === "admin" && diberi.has(u.id)) })) };
}
export async function tetapAkses(db: Db, p: Pelaku, userId: string, tahap: Tahap | null) {
  await sediakan(db);
  const u = await db.prepare("SELECT id FROM portal_users WHERE id=? AND status='active' AND deleted_at IS NULL").bind(userId).first();
  if (!u) return false;
  if (tahap === null) await db.prepare("DELETE FROM dashboard_spm_access WHERE user_id=?").bind(userId).run();
  else await db.prepare("INSERT INTO dashboard_spm_access(user_id,level,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET level=excluded.level,updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(userId, tahap, new Date().toISOString(), p.id).run();
  return true;
}
export async function tetapLalai(db: Db, tahap: "view" | "none") {
  await sediakan(db);
  await db.prepare("INSERT INTO dashboard_spm_settings(key,value,updated_at) VALUES('default_level',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(tahap, new Date().toISOString()).run();
}
