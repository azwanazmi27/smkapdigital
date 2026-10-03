import { portalActor, renewSessionCookie, clearSessionCookie, createPortalSession, deletePortalSession, sessionCookie } from "../../server-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { credential?: string };
    const session = await createPortalSession(body.credential || "");
    if (!session) return Response.json({ error: "Akaun DELIMa ini belum didaftarkan sebagai warga sekolah." }, { status: 403 });
    return Response.json({ success: true, me: session.user }, { headers: { "Set-Cookie": sessionCookie(session.token), "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Sesi DELIMa tidak dapat diwujudkan." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await deletePortalSession(request);
  return Response.json({ success: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
}

export async function GET(request:Request){
 try {const actor=await portalActor(request);if(!actor)return Response.json({authenticated:false},{status:401,headers:{'Cache-Control':'no-store'}});
 const cookie=renewSessionCookie(request);return Response.json({authenticated:true},{headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
 }catch{return Response.json({error:'Sesi tidak dapat disemak sekarang.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
