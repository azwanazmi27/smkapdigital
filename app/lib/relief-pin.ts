import { env } from "cloudflare:workers";

const encoder = new TextEncoder();
const configured = () => String(env.RELIEF_ACCESS_PIN || "");
const valid = (pin: unknown): pin is string => typeof pin === "string" && /^\d{6}$/.test(pin);

async function digest(salt: string, pin: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bytes = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100_000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function prepare() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS relief_pin_settings (id TEXT PRIMARY KEY, salt TEXT NOT NULL, pin_hash TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL)").run();
}

export async function verifyReliefPin(pin: string | null) {
  if (!valid(pin)) return false;
  await prepare();
  const row = await env.DB.prepare("SELECT salt,pin_hash FROM relief_pin_settings WHERE id='shared'").first<{ salt: string; pin_hash: string }>();
  if (row) return await digest(row.salt, pin) === row.pin_hash;
  return Boolean(configured()) && pin === configured();
}

export async function changeReliefPin(current: unknown, next: unknown, actorEmail: string) {
  if (!valid(next)) return { ok: false, error: "PIN baharu mestilah enam digit." };
  if (!await verifyReliefPin(typeof current === "string" ? current : null)) return { ok: false, error: "PIN semasa tidak betul." };
  if (current === next) return { ok: false, error: "Pilih PIN baharu yang berbeza." };
  const salt = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO relief_pin_settings(id,salt,pin_hash,updated_at,updated_by) VALUES('shared',?,?,?,?) ON CONFLICT(id) DO UPDATE SET salt=excluded.salt,pin_hash=excluded.pin_hash,updated_at=excluded.updated_at,updated_by=excluded.updated_by")
    .bind(salt, await digest(salt, next), new Date().toISOString(), actorEmail).run();
  return { ok: true };
}
