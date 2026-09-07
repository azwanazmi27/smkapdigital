import {env} from 'cloudflare:workers';
import {portalActor} from '../../server-auth';
import {managementDrive,encodeDriveBytes} from '../../management-drive';
import {managementPath} from '../../management-catalog';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const admin=(role:string)=>['admin','super_admin'].includes(role);
const text=(v:unknown,max=180)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function GET(request:Request){
 const me=await portalActor(request);if(!me)return json({error:'Sila log masuk.'},401);
 const all=new URL(request.url).searchParams.get('all')==='1';if(all&&!admin(me.role))return json({error:'Akses pentadbir sahaja.'},403);
 const result=await env.DB.prepare(`SELECT p.id,p.user_id AS userId,p.title,p.issuer,p.award_date AS awardDate,p.featured,u.name AS teacherName,u.position,u.grade,
 m.original_name AS fileName,e.status AS evidenceStatus FROM staff_portfolio p JOIN portal_users u ON u.id=p.user_id JOIN management_materials m ON m.id=p.id AND m.deleted_at=''
 LEFT JOIN skas_evidence e ON e.source_module='PENGURUSAN SEKOLAH' AND e.source_record_id=p.id ${all?'':'WHERE p.user_id=?'} ORDER BY u.name,p.featured DESC,p.created_at DESC`).bind(...(all?[]:[me.id])).all();
 const users=all?await env.DB.prepare("SELECT id,name,position,grade FROM portal_users WHERE status='active' AND deleted_at IS NULL ORDER BY name").all():null;
 return json({items:result.results,users:users?.results||[]});
}
export async function PUT(request:Request){
 const me=await portalActor(request);if(!me)return json({error:'Sila log masuk.'},401);
 const body=await request.json() as {ids?:unknown};
 if(!Array.isArray(body.ids)||body.ids.length>2||body.ids.some(id=>typeof id!=='string')||new Set(body.ids).size!==body.ids.length)return json({error:'Pilih maksimum dua kepakaran.'},400);
 const ids=body.ids as string[];
 const owned=await env.DB.prepare("SELECT p.id FROM staff_portfolio p JOIN management_materials m ON m.id=p.id AND m.deleted_at='' WHERE p.user_id=?").bind(me.id).all<{id:string}>();
 if(ids.some(id=>!owned.results.some(row=>row.id===id)))return json({error:'Kepakaran ini bukan milik anda atau sudah dipadam.'},403);
 await env.DB.prepare(`UPDATE staff_portfolio SET featured=CASE WHEN id IN (${ids.length?ids.map(()=>'?').join(','):"''"}) THEN 1 ELSE 0 END WHERE user_id=?`).bind(...ids,me.id).run();
 return json({success:true});
}
export async function POST(request:Request){
 try{
  const me=await portalActor(request);if(!me)return json({error:'Sila log masuk.'},401);
  const form=await request.formData(),id=text(form.get('id'),80),title=text(form.get('title')),issuer=text(form.get('issuer')),awardDate=text(form.get('awardDate'),10),file=form.get('file');
  if(!/^[0-9a-f-]{36}$/i.test(id)||!title)return json({error:'Nama kepakaran diperlukan.'},400);
  const existing=await env.DB.prepare('SELECT user_id FROM staff_portfolio WHERE id=?').bind(id).first<{user_id:string}>();
  if(existing)return existing.user_id===me.id?json({success:true,id}):json({error:'Rekod tidak sah.'},403);
  if(!(file instanceof File)||!file.size||file.size>8_000_000)return json({error:'Pilih fail sijil atau surat, maksimum 8 MB.'},400);
  const allowed=['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if(!allowed.includes(file.type))return json({error:'Pilih PDF, JPG, PNG, WebP atau DOCX.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const magic=String.fromCharCode(...bytes.slice(0,12));
  const valid=file.type==='application/pdf'?magic.startsWith('%PDF-'):file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:file.type==='image/png'?bytes[0]===137&&magic.slice(1,4)==='PNG':file.type==='image/webp'?magic.startsWith('RIFF')&&magic.slice(8)==='WEBP':magic.startsWith('PK');
  if(!valid)return json({error:'Kandungan fail tidak sepadan dengan jenis fail.'},400);
  const active=await env.DB.prepare("SELECT school_year FROM skas_years WHERE status='active' ORDER BY school_year DESC LIMIT 1").first<{school_year:number}>();
  if(!active)return json({error:'Pentadbir perlu membuka tahun aktif dahulu.'},400);
  const now=new Date().toISOString(),year=active.school_year,folderId='pengurusan-21',kind='Sijil, keputusan atau pengiktirafan',name=file.name.replace(/[\\/:*?"<>|]/g,'-').slice(0,180);
  const drive=await managementDrive({action:'management_upload',requestId:id,path:[String(year),...managementPath(folderId).split(' › '),'Portfolio Kepakaran Guru',me.id],name,mimeType:file.type,base64:encodeDriveBytes(bytes.buffer)});
  if(!drive.id||!drive.url)throw new Error('Drive belum mengesahkan fail. Cuba semula dengan borang yang sama.');
  const url=new URL('/api/pengurusan?file='+id,request.url).href;
  await env.DB.batch([
   env.DB.prepare('INSERT OR IGNORE INTO management_materials(id,school_year,folder_id,title,document_type,source_url,storage_key,mime_type,original_name,notes,visibility,owner_email,owner_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,year,folderId,title,kind,drive.url,drive.id,file.type,name,[issuer,awardDate].filter(Boolean).join(' · '),'private',me.email,me.name,now),
   env.DB.prepare('INSERT OR IGNORE INTO staff_portfolio(id,user_id,title,issuer,award_date,featured,created_at) VALUES(?,?,?,?,?,0,?)').bind(id,me.id,title,issuer,awardDate,now),
   env.DB.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,notes,status,submitted_by_email,submitted_by_name,source_module,source_record_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'portal',?,?,'pending',?,?,'PENGURUSAN SEKOLAH',?,?,?) ON CONFLICT DO NOTHING").bind(crypto.randomUUID(),year,'Kekuatan Sekolah','Kepakaran Guru',kind,title,'2',url,'Portfolio kepakaran guru. Cadangan Standard 2 mengikut katalog portal; pemetaan dan perakuan pentadbir diperlukan.',me.email,me.name,id,now,now),
  ]);
  return json({success:true,id});
 }catch(error){console.error('Portfolio upload',error);return json({error:error instanceof Error?error.message:'Portfolio belum dapat disimpan.'},400);}
}
