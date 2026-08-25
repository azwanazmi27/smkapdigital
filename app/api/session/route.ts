import { clearSessionCookie, createPortalSession, deletePortalSession, sessionCookie } from "../../server-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { credential?: string };
    const session = await createPortalSession(body.credential || "");
    if (!session) return Response.json({ error: "Akaun DELIMa ini belum didaftarkan sebagai warga sekolah." }, { status: 403 });
    return Response.json({ success: true, me: session.user }, { headers: { "Set-Cookie": sessionCookie(session.token, session.expires), "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Sesi DELIMa tidak dapat diwujudkan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await deletePortalSession(request);
  return Response.json({ success: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
}
