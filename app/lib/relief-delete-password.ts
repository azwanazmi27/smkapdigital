import { env } from "cloudflare:workers";
import { verifyReliefPin } from "./relief-pin";

const encoder = new TextEncoder();
type Kind = "delete" | "master";
const valid = (password: unknown): password is string => typeof password === "string" && password.length >= 4 && password.length <= 64;

async function digest(salt: string, password: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bytes = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100_000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function prepare() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS relief_delete_passwords (id TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL)").run();
}

async function matches(kind: Kind, password: string) {
  const row = await env.DB.prepare("SELECT salt,password_hash FROM relief_delete_passwords WHERE id=?").bind(kind).first<{ salt: string; password_hash: string }>();
  return { configured: Boolean(row), ok: row ? await digest(row.salt, password) === row.password_hash : false };
}

// Kata laluan padam atau kata laluan master diterima. Selagi pentadbir belum menetapkan
// kata laluan padam, PIN E-Keberadaan dikongsi diterima supaya fungsi padam tidak terkunci.
export async function verifyDeletePassword(password: string | null) {
  if (!valid(password)) return false;
  await prepare();
  const master = await matches("master", password);
  if (master.ok) return true;
  const current = await matches("delete", password);
  if (current.ok) return true;
  if (env.RELIEF_DELETE_PASSWORD && password === String(env.RELIEF_DELETE_PASSWORD)) return true;
  if (env.RELIEF_MASTER_PASSWORD && password === String(env.RELIEF_MASTER_PASSWORD)) return true;
  return !current.configured && await verifyReliefPin(password);
}

export async function deletePasswordStatus() {
  await prepare();
  const rows = await env.DB.prepare("SELECT id,updated_at,updated_by FROM relief_delete_passwords").all<{ id: Kind; updated_at: string; updated_by: string }>();
  const find = (kind: Kind) => rows.results.find((row: { id: Kind; updated_at: string; updated_by: string }) => row.id === kind) || null;
  return { delete: find("delete"), master: find("master") };
}

export async function setDeletePassword(kind: unknown, next: unknown, actorEmail: string) {
  if (kind !== "delete" && kind !== "master") return { ok: false, error: "Jenis kata laluan tidak sah." };
  if (!valid(next)) return { ok: false, error: "Kata laluan mestilah 4 hingga 64 aksara." };
  await prepare();
  const salt = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO relief_delete_passwords(id,salt,password_hash,updated_at,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET salt=excluded.salt,password_hash=excluded.password_hash,updated_at=excluded.updated_at,updated_by=excluded.updated_by")
    .bind(kind, salt, await digest(salt, next), new Date().toISOString(), actorEmail).run();
  return { ok: true };
}
