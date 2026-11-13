// Akses Dashboard PBD setiap warga: boleh edit, lihat sahaja atau tiada akses. Peraturan sama seperti Dashboard SPM
// (lihat dashboard-spm-store.ts) tetapi dengan jadual sendiri, supaya akses SPM dan PBD boleh berbeza.
// Modul ini tidak bergantung pada cloudflare:workers supaya boleh diuji dengan D1 tiruan.

export type Tahap = "edit" | "view" | "none";
export type Akses = { tahap: Tahap; urus: boolean };
type Pelaku = { id: string; role: string };
type Stmt = { bind(...v: unknown[]): Stmt; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<unknown> };
export type Db = { prepare(sql: string): Stmt; batch(list: Stmt[]): Promise<unknown> };

const TAHAP = new Set<Tahap>(["edit", "view", "none"]);
export const tahapSah = (v: unknown): v is Tahap => typeof v === "string" && TAHAP.has(v as Tahap);

let siap: Promise<unknown> | undefined;
export function sediakan(db: Db) {
  return siap ??= db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS dashboard_pbd_access (user_id TEXT PRIMARY KEY,level TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS dashboard_pbd_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)"),
  ]).catch((e) => { siap = undefined; throw e; });
}
// Untuk ujian: mulakan semula selepas pangkalan data tiruan baharu.
export const setSemula = () => { siap = undefined; };

// Pengurus: Super Admin, atau Admin yang diberi modul "Dashboard PBD" dalam tab Akses Admin portal.
async function adminDiberi(db: Db, id: string) {
  try { return !!await db.prepare("SELECT user_id FROM admin_module_permissions WHERE user_id=? AND module_key='dashboardpbd' AND enabled=1").bind(id).first(); }
  catch { return false; } // jadual belum wujud: belum ada Admin diberi modul ini
}
export async function tahapLalai(db: Db): Promise<Tahap> {
  const r = await db.prepare("SELECT value FROM dashboard_pbd_settings WHERE key='default_level'").first<{ value: string }>();
  return r && (r.value === "view" || r.value === "none") ? r.value : "view";
}
export async function aksesWarga(db: Db, p: Pelaku): Promise<Akses> {
  await sediakan(db);
  const urus = p.role === "super_admin" || (p.role === "admin" && await adminDiberi(db, p.id));
  if (urus) return { tahap: "edit", urus: true };
  const r = await db.prepare("SELECT level FROM dashboard_pbd_access WHERE user_id=?").bind(p.id).first<{ level: string }>();
  return { tahap: r && tahapSah(r.level) ? r.level : await tahapLalai(db), urus: false };
}

// Senarai untuk pengurus: semua warga aktif, tahap masing-masing (null = ikut lalai) dan siapa pengurus.
export async function senaraiAkses(db: Db) {
  await sediakan(db);
  const lalai = await tahapLalai(db);
  const w = await db.prepare("SELECT u.id,u.name,u.position,u.role,a.level FROM portal_users u LEFT JOIN dashboard_pbd_access a ON a.user_id=u.id WHERE u.status='active' AND u.deleted_at IS NULL ORDER BY u.name").all<{ id: string; name: string; position: string; role: string; level: string | null }>();
  let diberi = new Set<string>();
  try { diberi = new Set((await db.prepare("SELECT user_id FROM admin_module_permissions WHERE module_key='dashboardpbd' AND enabled=1").all<{ user_id: string }>()).results.map((x) => x.user_id)); } catch { /* jadual belum wujud */ }
  return { lalai, warga: w.results.map((u) => ({ id: u.id, nama: u.name, jawatan: u.position || "", tahap: tahapSah(u.level) ? u.level : null, urus: u.role === "super_admin" || (u.role === "admin" && diberi.has(u.id)) })) };
}
export async function tetapAkses(db: Db, p: Pelaku, userId: string, tahap: Tahap | null) {
  await sediakan(db);
  const u = await db.prepare("SELECT id FROM portal_users WHERE id=? AND status='active' AND deleted_at IS NULL").bind(userId).first();
  if (!u) return false;
  if (tahap === null) await db.prepare("DELETE FROM dashboard_pbd_access WHERE user_id=?").bind(userId).run();
  else await db.prepare("INSERT INTO dashboard_pbd_access(user_id,level,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET level=excluded.level,updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(userId, tahap, new Date().toISOString(), p.id).run();
  return true;
}
export async function tetapLalai(db: Db, tahap: "view" | "none") {
  await sediakan(db);
  await db.prepare("INSERT INTO dashboard_pbd_settings(key,value,updated_at) VALUES('default_level',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(tahap, new Date().toISOString()).run();
}
