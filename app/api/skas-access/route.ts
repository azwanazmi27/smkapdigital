import { env } from "cloudflare:workers";
import { portalActor } from "../../server-auth";

async function prepare() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_module_permissions (user_id TEXT NOT NULL,module_key TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,module_key))").run();
}

export async function GET(request: Request) {
  await prepare();
  const me = await portalActor(request);
  if (!me) return Response.json({ error: "Akaun belum disahkan." }, { status: 401 });
  const row = await env.DB.prepare("SELECT enabled FROM admin_module_permissions WHERE user_id=? AND module_key='skas'").bind(me.id).first<{ enabled: number }>();
  return Response.json({ allowed: row?.enabled !== 0 });
}

export async function PUT(request: Request) {
  await prepare();
  const me = await portalActor(request);
  if (!me || me.role !== "super_admin") return Response.json({ error: "Akses pentadbir diperlukan." }, { status: 403 });
  const body = await request.json() as { userId?: string; enabled?: boolean };
  if (!body.userId) return Response.json({ error: "Pengguna tidak sah." }, { status: 400 });
  await env.DB.prepare("INSERT INTO admin_module_permissions(user_id,module_key,enabled,updated_at) VALUES(?,'skas',?,?) ON CONFLICT(user_id,module_key) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at").bind(body.userId, body.enabled === false ? 0 : 1, new Date().toISOString()).run();
  return Response.json({ success: true });
}
