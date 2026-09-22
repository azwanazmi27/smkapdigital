import { env } from "cloudflare:workers";

export const GOOGLE_CLIENT_ID = "700702672944-20sjvug0albitl36cm671s7h19k57pc4.apps.googleusercontent.com";
const COOKIE_NAME = "smkap_session";
const SESSION_DAYS = 30;

type GoogleIdentity = {
  aud: string;
  email: string;
  email_verified: string | boolean;
  picture?: string;
};

export type PortalActor = {
  id: string;
  email: string;
  name: string;
  position: string;
  grade: string;
  role: string;
  status: string;
  googlePicture?: string;
};

function readCookie(request: Request, name: string) {
  const prefix = `${name}=`;
  return (request.headers.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length) || "";
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

let sessionTableReady: Promise<void> | null = null;

export async function ensureSessionTable() {
  if (sessionTableReady) return sessionTableReady;
  sessionTableReady = env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,google_picture TEXT NOT NULL DEFAULT '',expires_at TEXT NOT NULL,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON portal_sessions(user_id,expires_at)"),
  ]).then(() => undefined).catch((error) => { sessionTableReady = null; throw error; });
  return sessionTableReady;
}

export async function verifyGoogleCredential(credential: string) {
  if (!credential) return null;
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) return null;
  const data = await response.json() as GoogleIdentity;
  if (data.aud !== GOOGLE_CLIENT_ID || String(data.email_verified) !== "true" || !data.email?.toLowerCase().endsWith("@moe-dl.edu.my")) return null;
  if (env.MIGRATION_MODE === "isolated-staging" && data.email.toLowerCase() !== env.MIGRATION_TEST_EMAIL) return null;
  return { ...data, email: data.email.toLowerCase() };
}

export async function createPortalSession(credential: string) {
  const google = await verifyGoogleCredential(credential);
  if (!google) return null;
  const user = await env.DB.prepare("SELECT id,email,name,position,grade,role,status FROM portal_users WHERE email=? AND status='active' AND deleted_at IS NULL").bind(google.email).first<PortalActor>();
  if (!user) return null;
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  const digestValue = await digest(token);
  const insert = () => env.DB.prepare("INSERT INTO portal_sessions(token_hash,user_id,google_picture,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?)")
    .bind(digestValue, user.id, google.picture || "", expires.toISOString(), now.toISOString(), now.toISOString()).run();
  try { await insert(); }
  catch { await ensureSessionTable(); await insert(); }
  return { token, expires, user: { ...user, googlePicture: google.picture || "" } };
}

export function sessionCookie(token: string, expires: Date) {
  return `${COOKIE_NAME}=${token}; Path=/; Expires=${expires.toUTCString()}; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function deletePortalSession(request: Request) {
  await ensureSessionTable();
  const token = readCookie(request, COOKIE_NAME);
  if (token) await env.DB.prepare("DELETE FROM portal_sessions WHERE token_hash=?").bind(await digest(token)).run();
}

export async function portalActor(request: Request): Promise<PortalActor | null> {
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (bearer) {
    const google = await verifyGoogleCredential(bearer);
    if (google) {
      const user = await env.DB.prepare("SELECT id,email,name,position,grade,role,status FROM portal_users WHERE email=? AND status='active' AND deleted_at IS NULL").bind(google.email).first<PortalActor>();
      return user ? { ...user, googlePicture: google.picture || "" } : null;
    }
  }
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return null;
  const hash = await digest(token);
  const readActor = () => env.DB.prepare("SELECT u.id,u.email,u.name,u.position,u.grade,u.role,u.status,s.google_picture AS googlePicture FROM portal_sessions s JOIN portal_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='active' AND u.deleted_at IS NULL")
    .bind(hash, new Date().toISOString()).first<PortalActor>();
  let actor: PortalActor | null;
  try { actor = await readActor(); }
  catch { await ensureSessionTable(); actor = await readActor(); }
  if (env.MIGRATION_MODE === "isolated-staging" && actor?.email !== env.MIGRATION_TEST_EMAIL) return null;
  if (actor) void env.DB.prepare("UPDATE portal_sessions SET last_seen_at=? WHERE token_hash=?").bind(new Date().toISOString(), hash).run();
  return actor || null;
}
