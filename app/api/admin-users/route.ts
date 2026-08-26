import { env } from "cloudflare:workers";
import { seedPortalUsers } from "../../admin-user-seed";
import { portalActor } from "../../server-auth";

type GoogleIdentity={aud:string;email:string;email_verified:string|boolean;name?:string;picture?:string;sub:string};
type UserBody={id?:string;email?:string;name?:string;position?:string;grade?:string;role?:string;status?:string;showDirectory?:boolean;showOrgChart?:boolean;orgPosition?:string;orgOrder?:number;photoBase64?:string;mimeType?:string;settings?:Record<string,string>;permissions?:string[];title?:string;body?:string;audience?:string;publishedAt?:string;eventDate?:string;endDate?:string;category?:string;details?:string};
const CLIENT_ID="700702672944-20sjvug0albitl36cm671s7h19k57pc4.apps.googleusercontent.com";
const SUPER_ADMINS=[
  {email:"sekolah-2508@moe-dl.edu.my",name:"Pentadbir Sekolah"},
  {email:"g-55165663@moe-dl.edu.my",name:"NOOR AZWAN BIN AZMI"},
];
const roles=new Set(["super_admin","admin","teacher"]),statuses=new Set(["active","inactive"]);
const clean=(v:unknown,n=160)=>typeof v==="string"?v.trim().slice(0,n):"";

let preparation: Promise<void> | null = null;
async function prepare(){
  if(preparation)return preparation;
  preparation=(async()=>{
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,position TEXT NOT NULL DEFAULT '',grade TEXT NOT NULL DEFAULT '',role TEXT NOT NULL DEFAULT 'teacher',status TEXT NOT NULL DEFAULT 'active',show_directory INTEGER NOT NULL DEFAULT 1,show_org_chart INTEGER NOT NULL DEFAULT 0,org_position TEXT NOT NULL DEFAULT '',org_order REAL NOT NULL DEFAULT 999,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_portal_users_email ON portal_users(email)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_audit_logs (id TEXT PRIMARY KEY,actor_email TEXT NOT NULL,action TEXT NOT NULL,target_email TEXT NOT NULL,created_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_profiles (user_id TEXT PRIMARY KEY,avatar_key TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_module_permissions (user_id TEXT NOT NULL,module_key TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,module_key))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_settings (setting_key TEXT PRIMARY KEY,setting_value TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_announcements (id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,audience TEXT NOT NULL DEFAULT 'Semua',published_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'published',created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS portal_calendar (id TEXT PRIMARY KEY,title TEXT NOT NULL,event_date TEXT NOT NULL,end_date TEXT NOT NULL,category TEXT NOT NULL DEFAULT 'Sekolah',details TEXT NOT NULL DEFAULT '',created_by TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_portal_announcements_date ON portal_announcements(status,published_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_portal_calendar_date ON portal_calendar(event_date,end_date)"),
  ]);
  try{await env.DB.prepare("ALTER TABLE portal_users ADD COLUMN show_directory INTEGER NOT NULL DEFAULT 1").run();}catch{}
  try{await env.DB.prepare("ALTER TABLE portal_users ADD COLUMN show_org_chart INTEGER").run();}catch{}
  try{await env.DB.prepare("ALTER TABLE portal_users ADD COLUMN org_position TEXT NOT NULL DEFAULT ''").run();}catch{}
  try{await env.DB.prepare("ALTER TABLE portal_users ADD COLUMN org_order REAL NOT NULL DEFAULT 999").run();}catch{}
  const now=new Date().toISOString();
  await env.DB.batch(SUPER_ADMINS.map((u)=>env.DB.prepare("INSERT INTO portal_users(id,email,name,position,grade,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'super_admin','active',?,?) ON CONFLICT(email) DO UPDATE SET role='super_admin',status='active',deleted_at=NULL,updated_at=excluded.updated_at").bind(crypto.randomUUID(),u.email,u.name,"Pentadbir Portal","",now,now)));
  await env.DB.batch(seedPortalUsers.map((u)=>env.DB.prepare("INSERT INTO portal_users(id,email,name,position,grade,role,status,created_at,updated_at) VALUES(?,?,?,?,?,'teacher','active',?,?) ON CONFLICT(email) DO UPDATE SET name=CASE WHEN portal_users.name='' THEN excluded.name ELSE portal_users.name END,position=CASE WHEN portal_users.position='' THEN excluded.position ELSE portal_users.position END,updated_at=excluded.updated_at").bind(crypto.randomUUID(),u.email,u.name,u.position,u.grade,now,now)));
  await env.DB.prepare("UPDATE portal_users SET position='Guru Kanan Mata Pelajaran Bahasa' WHERE email='g-55165688@moe-dl.edu.my' AND position='Guru Akademik Biasa'").run();
  await env.DB.prepare(`UPDATE portal_users SET show_org_chart=1,org_position=position,org_order=CASE
    WHEN lower(position) LIKE '%pengetua%' AND lower(position) NOT LIKE '%penolong%' THEN 0
    WHEN lower(position) LIKE '%pentadbiran%' THEN 100 WHEN lower(position) LIKE '%hal ehwal murid%' THEN 110
    WHEN lower(position) LIKE '%kokurikulum%' AND lower(position) LIKE '%penolong kanan%' THEN 120
    WHEN lower(position) LIKE '%tingkatan enam%' AND lower(position) LIKE '%penolong kanan%' THEN 130
    WHEN lower(position) LIKE '%bahasa%' THEN 200 WHEN lower(position) LIKE '%sains & matematik%' THEN 210
    WHEN lower(position) LIKE '%kemanusiaan%' THEN 220 WHEN lower(position) LIKE '%teknik & vokasional%' THEN 230
    WHEN lower(position) LIKE '%pendidikan islam%' THEN 240 ELSE 900 END
    WHERE show_org_chart=0 AND org_position='' AND (lower(position) LIKE '%pengetua%' OR lower(position) LIKE '%penolong kanan%' OR lower(position) LIKE '%guru kanan mata pelajaran%')`).run();
  await env.DB.prepare(`UPDATE portal_users SET
    show_org_chart=CASE WHEN lower(position) LIKE '%pengetua%' OR lower(position) LIKE '%penolong kanan%' OR lower(position) LIKE '%guru kanan mata pelajaran%' THEN 1 ELSE 0 END,
    org_position=CASE WHEN org_position='' THEN position ELSE org_position END,
    org_order=CASE
      WHEN lower(position) LIKE '%pengetua%' AND lower(position) NOT LIKE '%penolong%' THEN 0
      WHEN lower(position) LIKE '%pentadbiran%' THEN 100
      WHEN lower(position) LIKE '%hal ehwal murid%' THEN 110
      WHEN lower(position) LIKE '%kokurikulum%' AND lower(position) LIKE '%penolong kanan%' THEN 120
      WHEN lower(position) LIKE '%tingkatan enam%' AND lower(position) LIKE '%penolong kanan%' THEN 130
      WHEN lower(position) LIKE '%bahasa%' THEN 200
      WHEN lower(position) LIKE '%sains & matematik%' THEN 210
      WHEN lower(position) LIKE '%kemanusiaan%' THEN 220
      WHEN lower(position) LIKE '%teknik & vokasional%' THEN 230
      WHEN lower(position) LIKE '%pendidikan islam%' THEN 240
      ELSE 900 END
    WHERE show_org_chart IS NULL`).run();
  const defaults={school_name:"Sekolah Menengah Kebangsaan Agama Pahang",school_code:"CRA8001",school_grade:"Gred A",school_type:"Sekolah Kluster Kecemerlangan",school_founded:"26 Februari 1996",school_motto:"Berilmu, Bertakwa",school_vision:"Pendidikan Berkualiti, Insan Terdidik, Negara Sejahtera",school_mission:"Melestarikan sistem pendidikan yang berkualiti untuk membangunkan potensi individu bagi memenuhi aspirasi negara.",school_history:"SMK Agama Pahang ditubuhkan pada 26 Februari 1996 di Muadzam Shah sebagai institusi pendidikan menengah kebangsaan agama yang menggabungkan kecemerlangan akademik, pengajian Islam dan pembentukan sahsiah.",school_email:"cra8001@moe.edu.my",school_phone:"09-4523901",school_address:"26700 Muadzam Shah, Pahang",parent_coop_url:"https://koperasismkap.kiah.store/",parent_pibg_url:"https://app.herepay.org/pibgsmkapahang",footer_notice:"Portal rasmi sekolah · Dibangunkan oleh BangWan",module_opr:"enabled",module_ekeberadaan:"enabled",module_etempahan:"enabled",module_ekunjung:"enabled",module_achievement:"enabled"};
  await env.DB.batch(Object.entries(defaults).map(([key,value])=>env.DB.prepare("INSERT OR IGNORE INTO portal_settings(setting_key,setting_value,updated_at) VALUES(?,?,?)").bind(key,value,now)));
  })().catch(error=>{preparation=null;throw error;});
  return preparation;
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
async function actor(request:Request){return portalActor(request);}
const denied=(admin=false)=>Response.json({error:admin?"Akaun ini belum dibenarkan menggunakan panel pentadbir.":"Akaun DELIMa ini belum didaftarkan sebagai warga sekolah."},{status:403});
async function audit(email:string,action:string,target:string){await env.DB.prepare("INSERT INTO admin_audit_logs(id,actor_email,action,target_email,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),email,action,target,new Date().toISOString()).run();}

export async function GET(request:Request){
  try{await prepare();const resource=new URL(request.url).searchParams.get("resource");if(resource==="config")return Response.json({clientId:CLIENT_ID});if(resource==="directory"){const result=await env.DB.prepare("SELECT id,name,position,grade FROM portal_users WHERE status='active' AND deleted_at IS NULL AND show_directory=1 ORDER BY name").all();return Response.json({users:result.results});}if(resource==="public-settings"){const rows=await env.DB.prepare("SELECT setting_key,setting_value FROM portal_settings").all<Record<string,string>>();return Response.json({settings:Object.fromEntries(rows.results.map(x=>[x.setting_key,x.setting_value]))});}const me=await actor(request);if(!me)return denied();if(resource==="me"){const profile=await env.DB.prepare("SELECT avatar_key AS avatarKey FROM portal_profiles WHERE user_id=?").bind(me.id).first<{avatarKey:string}>();let avatarDataUrl=me.googlePicture||"";if(profile?.avatarKey){const object=await env.FILES.get(profile.avatarKey);if(object){const bytes=new Uint8Array(await object.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));avatarDataUrl=`data:${object.httpMetadata?.contentType||"image/jpeg"};base64,${btoa(binary)}`;}}const {googlePicture,...safeMe}=me;return Response.json({me:{...safeMe,avatarDataUrl}});}if(me.role!=="super_admin"&&me.role!=="admin")return denied(true);const [users,trash,logs,settings,permissions]=await Promise.all([env.DB.prepare("SELECT id,email,name,position,grade,role,status,show_directory AS showDirectory,show_org_chart AS showOrgChart,org_position AS orgPosition,org_order AS orgOrder,created_at AS createdAt,updated_at AS updatedAt FROM portal_users WHERE deleted_at IS NULL ORDER BY name,email").all(),env.DB.prepare("SELECT id,email,name,position,grade,role,status,show_directory AS showDirectory,show_org_chart AS showOrgChart,org_position AS orgPosition,org_order AS orgOrder,deleted_at AS deletedAt FROM portal_users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all(),env.DB.prepare("SELECT id,actor_email AS actorEmail,action,target_email AS targetEmail,created_at AS createdAt FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100").all(),env.DB.prepare("SELECT setting_key,setting_value FROM portal_settings").all<Record<string,string>>(),env.DB.prepare("SELECT user_id AS userId,module_key AS moduleKey,enabled FROM admin_module_permissions").all()]);return Response.json({me,users:users.results,trash:trash.results,logs:logs.results,settings:Object.fromEntries(settings.results.map(x=>[x.setting_key,x.setting_value])),permissions:permissions.results});}
  catch(error){console.error("Admin users read",error);return Response.json({error:"Senarai pengguna tidak dapat dibaca sekarang."},{status:500});}
}
export async function POST(request:Request){
  try{await prepare();const me=await actor(request);if(!me||me.role!=="super_admin")return denied();const url=new URL(request.url),resource=url.searchParams.get("resource");if(resource==="restore"){const id=clean(url.searchParams.get("id")),target=await env.DB.prepare("SELECT email FROM portal_users WHERE id=? AND deleted_at IS NOT NULL").bind(id).first<{email:string}>();if(!target)return Response.json({error:"Pengguna tidak ditemui."},{status:404});await env.DB.prepare("UPDATE portal_users SET status='active',deleted_at=NULL,updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();await audit(me.email,"restore",target.email);return Response.json({success:true});}const b=await request.json() as UserBody,email=clean(b.email).toLowerCase(),name=clean(b.name),role=roles.has(clean(b.role))?clean(b.role):"teacher",status=statuses.has(clean(b.status))?clean(b.status):"active";if(!email.endsWith("@moe-dl.edu.my")||!name)return Response.json({error:"Nama dan e-mel DELIMa yang sah diperlukan."},{status:400});const now=new Date().toISOString();await env.DB.prepare("INSERT INTO portal_users(id,email,name,position,grade,role,status,show_directory,show_org_chart,org_position,org_order,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(email) DO UPDATE SET name=excluded.name,position=excluded.position,grade=excluded.grade,role=excluded.role,status=excluded.status,show_directory=excluded.show_directory,show_org_chart=excluded.show_org_chart,org_position=excluded.org_position,org_order=excluded.org_order,updated_at=excluded.updated_at,deleted_at=NULL").bind(crypto.randomUUID(),email,name,clean(b.position),clean(b.grade,12),role,status,b.showDirectory===false?0:1,b.showOrgChart?1:0,clean(b.orgPosition)||clean(b.position),Number.isFinite(b.orgOrder)?b.orgOrder:999,now,now).run();await audit(me.email,"create",email);return Response.json({success:true});}
  catch(error){console.error("Admin users create",error);return Response.json({error:"Pengguna tidak dapat disimpan."},{status:500});}
}
export async function PUT(request:Request){
  try{
    await prepare();const me=await actor(request);if(!me)return denied();const resource=new URL(request.url).searchParams.get("resource"),b=await request.json() as UserBody;
    if(resource==="admin-photo"){if(me.role!=="super_admin")return denied(true);const id=clean(b.id),target=await env.DB.prepare("SELECT email FROM portal_users WHERE id=? AND deleted_at IS NULL").bind(id).first<{email:string}>();if(!target)return Response.json({error:"Pengguna tidak ditemui."},{status:404});const mime=clean(b.mimeType,40);if(!b.photoBase64||!["image/jpeg","image/png","image/webp"].includes(mime))return Response.json({error:"Pilih gambar JPG, PNG atau WebP."},{status:400});const bytes=Uint8Array.from(atob(b.photoBase64),c=>c.charCodeAt(0));if(bytes.byteLength>1_500_000)return Response.json({error:"Gambar pentadbir mesti 1.5 MB atau kurang."},{status:400});const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",key=`profiles/${id}.${ext}`;await env.FILES.put(key,bytes,{httpMetadata:{contentType:mime}});await env.DB.prepare("INSERT INTO portal_profiles(user_id,avatar_key,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET avatar_key=excluded.avatar_key,updated_at=excluded.updated_at").bind(id,key,new Date().toISOString()).run();await audit(me.email,"admin_photo_update",target.email);return Response.json({success:true});}
    if(resource==="profile"){if(b.photoBase64){const mime=clean(b.mimeType,40);if(!["image/jpeg","image/png","image/webp"].includes(mime))return Response.json({error:"Pilih gambar JPG, PNG atau WebP."},{status:400});const binary=atob(b.photoBase64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(bytes.byteLength>1_500_000)return Response.json({error:"Gambar profil mesti 1.5 MB atau kurang."},{status:400});const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg",key=`profiles/${me.id}.${ext}`;await env.FILES.put(key,bytes,{httpMetadata:{contentType:mime}});await env.DB.prepare("INSERT INTO portal_profiles(user_id,avatar_key,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET avatar_key=excluded.avatar_key,updated_at=excluded.updated_at").bind(me.id,key,new Date().toISOString()).run();return Response.json({success:true});}const name=clean(b.name),position=clean(b.position),grade=clean(b.grade,12);if(!name)return Response.json({error:"Nama perlu diisi."},{status:400});await env.DB.prepare("UPDATE portal_users SET name=?,position=?,grade=?,updated_at=? WHERE id=? AND deleted_at IS NULL").bind(name,position,grade,new Date().toISOString(),me.id).run();await audit(me.email,"profile_update",me.email);return Response.json({success:true});}
    if(resource==="settings"){if(me.role!=="super_admin"&&me.role!=="admin")return denied(true);const allowed=new Set(["school_email","school_phone","school_address","footer_notice",...(me.role==="super_admin"?["module_opr","module_ekeberadaan","module_etempahan","module_ekunjung","module_achievement"]:[])]),now=new Date().toISOString(),entries=Object.entries(b.settings||{}).filter(([key])=>allowed.has(key));if(entries.length)await env.DB.batch(entries.map(([key,value])=>env.DB.prepare("INSERT INTO portal_settings(setting_key,setting_value,updated_at) VALUES(?,?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=excluded.updated_at").bind(key,clean(value,300),now)));await audit(me.email,"settings_update",entries.map(x=>x[0]).join(","));return Response.json({success:true});}
    if(resource==="permissions"){if(me.role!=="super_admin")return denied(true);const id=clean(b.id),now=new Date().toISOString(),modules=["users","content","opr","ekeberadaan","etempahan","ekunjung","achievement","logs"];await env.DB.prepare("DELETE FROM admin_module_permissions WHERE user_id=?").bind(id).run();const selected=new Set(b.permissions||[]);await env.DB.batch(modules.map(key=>env.DB.prepare("INSERT INTO admin_module_permissions(user_id,module_key,enabled,updated_at) VALUES(?,?,?,?)").bind(id,key,selected.has(key)?1:0,now)));await audit(me.email,"permissions_update",id);return Response.json({success:true});}
    if(me.role!=="super_admin")return denied(true);const id=clean(b.id),email=clean(b.email).toLowerCase(),name=clean(b.name),role=roles.has(clean(b.role))?clean(b.role):"teacher",status=statuses.has(clean(b.status))?clean(b.status):"active";if(!id||!email.endsWith("@moe-dl.edu.my")||!name)return Response.json({error:"Maklumat pengguna tidak lengkap."},{status:400});await env.DB.prepare("UPDATE portal_users SET email=?,name=?,position=?,grade=?,role=?,status=?,show_directory=?,show_org_chart=?,org_position=?,org_order=?,updated_at=? WHERE id=? AND deleted_at IS NULL").bind(email,name,clean(b.position),clean(b.grade,12),role,status,b.showDirectory===false?0:1,b.showOrgChart?1:0,clean(b.orgPosition)||clean(b.position),Number.isFinite(b.orgOrder)?b.orgOrder:999,new Date().toISOString(),id).run();await audit(me.email,"update",email);return Response.json({success:true});
  }
  catch(error){console.error("Admin users update",error);return Response.json({error:"Perubahan tidak dapat disimpan."},{status:500});}
}
export async function DELETE(request:Request){
  try{await prepare();const me=await actor(request);if(!me||me.role!=="super_admin")return denied();const id=clean(new URL(request.url).searchParams.get("id"));const target=await env.DB.prepare("SELECT email,role FROM portal_users WHERE id=? AND deleted_at IS NULL").bind(id).first<{email:string;role:string}>();if(!target)return Response.json({error:"Pengguna tidak ditemui."},{status:404});if(target.email===me.email||SUPER_ADMINS.some(x=>x.email===target.email))return Response.json({error:"Akaun Super Admin utama tidak boleh dipadam."},{status:400});await env.DB.prepare("UPDATE portal_users SET status='inactive',deleted_at=?,updated_at=? WHERE id=?").bind(new Date().toISOString(),new Date().toISOString(),id).run();await audit(me.email,"delete",target.email);return Response.json({success:true});}
  catch(error){console.error("Admin users delete",error);return Response.json({error:"Pengguna tidak dapat dipadam."},{status:500});}
}
