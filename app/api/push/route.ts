import { env } from "cloudflare:workers";
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { portalActor } from "../../server-auth";

type PushBody = {
  action?: "subscribe" | "unsubscribe" | "send";
  endpoint?: string;
  expirationTime?: unknown;
  keys?: { p256dh?: string; auth?: string };
  title?: string;
  body?: string;
  url?: string;
  audience?: "Semua warga" | "Guru" | "Admin" | "Pengguna tertentu";
  userIds?: string[];
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function prepare() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,endpoint TEXT NOT NULL UNIQUE,p256dh TEXT NOT NULL,auth TEXT NOT NULL,user_agent TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS push_notifications (id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,url TEXT NOT NULL,audience TEXT NOT NULL,status TEXT NOT NULL,sent_count INTEGER NOT NULL DEFAULT 0,failed_count INTEGER NOT NULL DEFAULT 0,created_by TEXT NOT NULL,created_at TEXT NOT NULL)"),
  ]);
}

function vapid() {
  const subject = process.env.VAPID_SUBJECT || "mailto:cra8001@moe.edu.my";
  const publicKey = process.env.VAPID_SERVER_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_SERVER_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) throw new Error("Kunci notifikasi belum dikonfigurasi");
  return { subject, publicKey, privateKey };
}

export async function GET(request: Request) {
  try {
    await prepare();
    const me = await portalActor(request);
    if (!me) return Response.json({ error: "Log masuk DELIMa diperlukan." }, { status: 403 });
    const params = new URL(request.url).searchParams;
    const view = params.get("view");
    if (view === "config") return Response.json({ publicKey: vapid().publicKey });
    if (view === "notification") {
      const id = clean(params.get("id"), 80);
      const notification = id ? await env.DB.prepare("SELECT id,title,body,created_at AS createdAt FROM push_notifications WHERE id=?").bind(id).first() : null;
      if (!notification) return Response.json({ error: "Notifikasi tidak ditemui." }, { status: 404 });
      return Response.json({ notification });
    }
    if (!['admin','super_admin'].includes(me.role)) return Response.json({ error: "Akses pentadbir diperlukan." }, { status: 403 });
    const [summary, history] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS total,COUNT(DISTINCT user_id) AS users FROM push_subscriptions").first<{ total: number; users: number }>(),
      env.DB.prepare("SELECT id,title,body,url,audience,status,sent_count AS sentCount,failed_count AS failedCount,created_by AS createdBy,created_at AS createdAt FROM push_notifications ORDER BY created_at DESC LIMIT 30").all(),
    ]);
    return Response.json({ summary: summary || { total: 0, users: 0 }, history: history.results });
  } catch (error) {
    console.error("Push read", error);
    return Response.json({ error: "Maklumat notifikasi tidak dapat dibaca." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await prepare();
    const me = await portalActor(request);
    if (!me) return Response.json({ error: "Log masuk DELIMa diperlukan." }, { status: 403 });
    const input = await request.json() as PushBody;
    const now = new Date().toISOString();
    if (input.action === "subscribe") {
      const endpoint = clean(input.endpoint, 2000), p256dh = clean(input.keys?.p256dh, 500), auth = clean(input.keys?.auth, 500);
      if (!endpoint.startsWith("https://") || !p256dh || !auth) return Response.json({ error: "Maklumat peranti tidak sah." }, { status: 400 });
      await env.DB.prepare("INSERT INTO push_subscriptions(id,user_id,endpoint,p256dh,auth,user_agent,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,user_agent=excluded.user_agent,updated_at=excluded.updated_at")
        .bind(crypto.randomUUID(), me.id, endpoint, p256dh, auth, clean(request.headers.get("user-agent"), 500), now, now).run();
      return Response.json({ success: true });
    }
    if (input.action === "unsubscribe") {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?").bind(clean(input.endpoint, 2000), me.id).run();
      return Response.json({ success: true });
    }
    if (input.action !== "send" || !['admin','super_admin'].includes(me.role)) return Response.json({ error: "Akses pentadbir diperlukan." }, { status: 403 });
    const title = clean(input.title, 100), message = clean(input.body, 500), audience = input.audience || "Semua warga";
    if (!title || !message) return Response.json({ error: "Tajuk dan mesej notifikasi perlu diisi." }, { status: 400 });
    const id = crypto.randomUUID();
    const requestedUrl = clean(input.url, 500) || "/";
    const url = requestedUrl === "__notification__" ? `/?notification=${encodeURIComponent(id)}` : requestedUrl;
    const userIds = Array.isArray(input.userIds) ? [...new Set(input.userIds.map(id => clean(id, 80)).filter(Boolean))].slice(0, 200) : [];
    if (audience === "Pengguna tertentu" && !userIds.length) return Response.json({ error: "Pilih sekurang-kurangnya seorang pengguna." }, { status: 400 });
    const where = audience === "Admin" ? "AND u.role IN ('admin','super_admin')" : audience === "Guru" ? "AND u.role='teacher'" : audience === "Pengguna tertentu" ? `AND u.id IN (${userIds.map(() => "?").join(",")})` : "";
    const statement = env.DB.prepare(`SELECT s.id,s.endpoint,s.p256dh,s.auth FROM push_subscriptions s JOIN portal_users u ON u.id=s.user_id WHERE u.status='active' AND u.deleted_at IS NULL ${where}`);
    const rows = audience === "Pengguna tertentu" ? await statement.bind(...userIds).all<{ id: string; endpoint: string; p256dh: string; auth: string }>() : await statement.all<{ id: string; endpoint: string; p256dh: string; auth: string }>();
    let sent = 0, failed = 0;
    const keys = vapid();
    await Promise.all(rows.results.map(async row => {
      try {
        const subscription: PushSubscription = { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } };
        const init = await buildPushPayload({ data: { title, body: message, url, tag: `smkap-${Date.now()}` }, options: { ttl: 86400, urgency: "normal" } }, subscription, keys);
        const response = await fetch(row.endpoint, init);
        if (!response.ok) {
          failed++;
          if (response.status === 404 || response.status === 410) await env.DB.prepare("DELETE FROM push_subscriptions WHERE id=?").bind(row.id).run();
        } else sent++;
      } catch { failed++; }
    }));
    await env.DB.prepare("INSERT INTO push_notifications(id,title,body,url,audience,status,sent_count,failed_count,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(id, title, message, url, audience === "Pengguna tertentu" ? `Pengguna tertentu (${userIds.length})` : audience, failed ? (sent ? "sebahagian" : "gagal") : "berjaya", sent, failed, me.email, now).run();
    return Response.json({ success: true, id, sent, failed });
  } catch (error) {
    console.error("Push write", error);
    return Response.json({ error: "Notifikasi tidak dapat diproses sekarang." }, { status: 500 });
  }
}
