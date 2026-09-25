import { env } from "cloudflare:workers";

const encoder = new TextEncoder();

async function hash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 210_000, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a[index] ^ b[index];
  return diff === 0;
}

async function currentRow() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS relief_delete_password (id TEXT PRIMARY KEY, salt TEXT NOT NULL, password_hash TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL)").run();
  return env.DB.prepare("SELECT salt,password_hash FROM relief_delete_password WHERE id='master'").first<{salt: string; password_hash: string}>();
}

export async function reliefDeletePasswordConfigured() {
  return Boolean(await currentRow() || env.RELIEF_DELETE_PASSWORD);
}

export async function verifyReliefDeletePassword(password: string | null) {
  if (!password) return false;
  const row = await currentRow();
  if (row) {
    const actual = await hash(password, row.salt);
    const expected = Uint8Array.from(row.password_hash.match(/../g) || [], (part) => Number.parseInt(part, 16));
    return equal(actual, expected);
  }
  const original = String(env.RELIEF_DELETE_PASSWORD || "");
  if (!original) return false;
  return equal(encoder.encode(password), encoder.encode(original));
}

export async function changeReliefDeletePassword(current: unknown, next: unknown, actorEmail: string) {
  if (typeof current !== "string" || !await verifyReliefDeletePassword(current)) return { ok: false, error: "Kata laluan semasa tidak betul." };
  if (typeof next !== "string" || next.length < 12 || next.length > 128) return { ok: false, error: "Kata laluan baharu mestilah 12 hingga 128 aksara." };
  if (current === next) return { ok: false, error: "Pilih kata laluan baharu yang berbeza." };
  const salt = crypto.randomUUID();
  const passwordHash = Array.from(await hash(next, salt), (byte) => byte.toString(16).padStart(2, "0")).join("");
  await env.DB.prepare("INSERT INTO relief_delete_password(id,salt,password_hash,updated_at,updated_by) VALUES('master',?,?,?,?) ON CONFLICT(id) DO UPDATE SET salt=excluded.salt,password_hash=excluded.password_hash,updated_at=excluded.updated_at,updated_by=excluded.updated_by")
    .bind(salt, passwordHash, new Date().toISOString(), actorEmail).run();
  return { ok: true };
}

export async function initializeReliefDeletePassword(next: unknown, actorEmail: string) {
  if (await reliefDeletePasswordConfigured()) return { ok: false, error: "Kata laluan utama telah ditetapkan." };
  if (typeof next !== "string" || next.length < 12 || next.length > 128) return { ok: false, error: "Kata laluan baharu mestilah 12 hingga 128 aksara." };
  const salt = crypto.randomUUID();
  const passwordHash = Array.from(await hash(next, salt), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const result = await env.DB.prepare("INSERT OR IGNORE INTO relief_delete_password(id,salt,password_hash,updated_at,updated_by) VALUES('master',?,?,?,?)")
    .bind(salt, passwordHash, new Date().toISOString(), actorEmail).run();
  return result.meta.changes === 1 ? { ok: true } : { ok: false, error: "Kata laluan utama telah ditetapkan oleh pentadbir lain." };
}
