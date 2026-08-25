import { env } from "cloudflare:workers";
import { seedPortalUsers } from "../../admin-user-seed";

type GoogleIdentity={aud:string;email:string;email_verified:string|boolean;name?:string;sub:string};
type UserBody={id?:string;email?:string;name?:string;position?:string;grade?:string;role?:string;status?:string};
const CLIENT_ID="700702672944-20sjvug0albitl36cm671s7h19k57pc4.apps.googleusercontent.com";
const SUPER_ADMINS=[
  {email:"sekolah-2508@moe-dl.edu.my",name:"Pentadbir Sekolah"},
  {email:"g-55165663@moe-dl.edu.my",name:"NOOR AZWAN BIN AZMI"},
];
const roles=new Set(["super_admin","admin","module_admin","teacher"]),statuses=new Set(["active","inactive"]);
const clean=(v:unknown,n=160)=>typeof v==="string"?v.trim().slice(0,n):"";

async function prepare(){
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,position TEXT NOT NULL DEFAULT '',grade TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT 'teacher',status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_portal_users_email ON portal_users(email)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_audit_logs (id TEXT PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_email TEXT NOT NULL,created_at TEXT NOT NULL)"),
  ]);
  const now=new Date().toISOString();
  await env.DB.batch(SUPER_ADMINS.map((u)=>env.DB.prepare("INSERT INTO portal_users(id,email,name,position,grade,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'super_admin','active',?,?) ON CONFLICT(email) DO UPDATE SET role='super_admin',status='active',deleted_at=NULL,updated_at=excluded.updated_at").bind(crypto.randomUUID(),u.email,u.name,"Pentadbir Portal","",now,now)));
  await env.DB.batch(seedPortalUsers.map((u)=>env.DB.prepare("INSERT INTO portal_users(id,email,name,position,grade,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'teacher','active',?,?) ON CONFLICT(email) DO UPDATE SET name=CASE WHEN portal_users.name='' THEN excluded.name ELSE portal_users.name END,position=CASE WHEN portal_users.position='' THEN excluded.position ELSE portal_users.position END,updated_at=excluded.updated_at").bind(crypto.randomUUID(),u.email,u.name,u.position,u.grade,now,now)));
}
async function identity(request:Request){
  const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token)return null;
  const response=await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if(!response.ok)return null;
  const data=await response.json() as GoogleIdentity;
  if(data.aud!==CLIENT_ID||String(data.email_verified)!=="true"||!data.email?.toLowerCase().endsWith("@moe-dl.edu.my"))return null;
  return {...data,email:data.email.toLowerCase()};
}
async function actor(request:Request){
  const google=await identity(request);if(!google)return null;
  return env.DB.prepare("SELECT id,email,name,position,grade,role,status FROM portal_users WHERE email=? AND status='active' AND deleted_at IS NULL").bind(google.email).first<Record<string,string>>();
}
const denied=()=>Response.json({error:"Akaun ini belum dibenarkan menggunakan panel pentadbir."},{status:403});
async function audit(email:string,action:string,target:string){await env.DB.prepare("INSERT INTO admin_audit_logs(id,actor_email,action,target_email,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),email,action,target,new Date().toISOString()).run();}

export async function GET(request:Request){
  try{await prepare();if(new URL(request.url).searchParams.get("resource")==="config")return Response.json({clientId:CLIENT_ID});const me=await actor(request);if(!me)return denied();if(me.role!=="super_admin"&&me.role!=="admin")return denied();const result=await env.DB.prepare("SELECT id,email,name,position,grade,role,status,created_at AS createdAt,updated_at AS updatedAt FROM portal_users WHERE deleted_at IS NULL ORDER BY name,email").all();return Response.json({me,users:result.results});}
  catch(error){console.error("Admin users read",error);return Response.json({error:"Senarai pengguna tidak dapat dibaca sekarang."},{status:500});}
}
export async function POST(request:Request){
  try{await prepare();const me=await actor(request);if(!me||me.role!=="super_admin")return denied();const b=await request.json() as UserBody,email=clean(b.email).toLowerCase(),name=clean(b.name),role=roles.has(clean(b.role))?clean(b.role):"teacher",status=statuses.has(clean(b.status))?clean(b.status):"active";if(!email.endsWith("@moe-dl.edu.my")||!name)return Response.json({error:"Nama dan e-mel DELIMa yang sah diperlukan."},{status:400});const now=new Date().toISOString();await env.DB.prepare("INSERT INTO portal_users(id,email,name,position,grade,role,status,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(email) DO UPDATE SET name=excluded.name,position=excluded.position,grade=excluded.grade,role=excluded.role,status=excluded.status,updated_at=excluded.updated_at,deleted_at=NULL").bind(crypto.randomUUID(),email,name,clean(b.position),clean(b.grade,12),role,status,now,now).run();await audit(me.email,"create",email);return Response.json({success:true});}
  catch(error){console.error("Admin users create",error);return Response.json({error:"Pengguna tidak dapat disimpan."},{status:500});}
}
export async function PUT(request:Request){
  try{await prepare();const me=await actor(request);if(!me||me.role!=="super_admin")return denied();const b=await request.json() as UserBody,id=clean(b.id),email=clean(b.email).toLowerCase(),name=clean(b.name),role=roles.has(clean(b.role))?clean(b.role):"teacher",status=statuses.has(clean(b.status))?clean(b.status):"active";if(!id||!email.endsWith("@moe-dl.edu.my")||!name)return Response.json({error:"Maklumat pengguna tidak lengkap."},{status:400});await env.DB.prepare("UPDATE portal_users SET email=?,name=?,position=?,grade=?,role=?,status=?,updated_at=? WHERE id=? AND deleted_at IS NULL").bind(email,name,clean(b.position),clean(b.grade,12),role,status,new Date().toISOString(),id).run();await audit(me.email,"update",email);return Response.json({success:true});}
  catch(error){console.error("Admin users update",error);return Response.json({error:"Perubahan tidak dapat disimpan."},{status:500});}
}
export async function DELETE(request:Request){
  try{await prepare();const me=await actor(request);if(!me||me.role!=="super_admin")return denied();const id=clean(new URL(request.url).searchParams.get("id"));const target=await env.DB.prepare("SELECT email,role FROM portal_users WHERE id=? AND deleted_at IS NULL").bind(id).first<{email:string;role:string}>();if(!target)return Response.json({error:"Pengguna tidak ditemui."},{status:404});if(target.email===me.email||SUPER_ADMINS.some(x=>x.email===target.email))return Response.json({error:"Akaun Super Admin utama tidak boleh dipadam."},{status:400});await env.DB.prepare("UPDATE portal_users SET status='inactive',deleted_at=?,updated_at=? WHERE id=?").bind(new Date().toISOString(),new Date().toISOString(),id).run();await audit(me.email,"delete",target.email);return Response.json({success:true});}
  catch(error){console.error("Admin users delete",error);return Response.json({error:"Pengguna tidak dapat dipadam."},{status:500});}
}
