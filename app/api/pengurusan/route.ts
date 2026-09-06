import {portalActor} from '../../server-auth';
import {managementStore} from '../../management-store';
import {managementFolders,managementDocumentTypes,managementPath} from '../../management-catalog';
import {canReadMaterial,canDeleteMaterial,isManagementAdmin,managementSource,mappingDomain,safeMaterialUrl,validSchoolYear} from '../../management-model';
import {skasStandards} from '../../skas-catalog';
import {managementDrive,encodeDriveBytes} from '../../management-drive';

type Material={id:string;schoolYear:number;folderId:string;title:string;documentType:string;sourceUrl:string;storageKey:string;mimeType:string;originalName:string;notes:string;visibility:string;ownerEmail:string;ownerName:string;createdAt:string;mappingStatus?:string};
const columns='m.id,m.school_year AS schoolYear,m.folder_id AS folderId,m.title,m.document_type AS documentType,m.source_url AS sourceUrl,m.storage_key AS storageKey,m.mime_type AS mimeType,m.original_name AS originalName,m.notes,m.visibility,m.owner_email AS ownerEmail,m.owner_name AS ownerName,m.created_at AS createdAt';
const text=(v:unknown,max=180)=>typeof v==='string'?v.trim().slice(0,max):'';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
function sameOrigin(r:Request){const origin=r.headers.get('origin');return !origin||origin===new URL(r.url).origin;}
async function row(id:string){return managementStore().db.prepare('SELECT '+columns+" FROM management_materials m WHERE m.id=? AND m.deleted_at=''").bind(id).first<Material>();}
async function assertOpenYear(year:number){
 const state=await managementStore().db.prepare('SELECT status FROM skas_years WHERE school_year=?').bind(year).first<{status:string}>();
 if(!state||state.status==='closed')throw new Error('Tahun ini belum dibuka atau telah ditutup. Hubungi pentadbir.');
}
export async function GET(request:Request){
 try{
  const me=await portalActor(request);if(!me)return json({error:'Sila log masuk dengan akaun sekolah.'},401);
  const {db}=managementStore(),url=new URL(request.url),id=text(url.searchParams.get('file'),80);
  if(url.searchParams.get('health')==='1'){
   if(!isManagementAdmin(me.role))return json({error:'Semakan sambungan hanya untuk pentadbir.'},403);
   const result=await managementDrive({action:'management_health'});
   return json({ok:result.ok,service:result.service});
  }
  if(id){
   const doc=await row(id);if(!doc||!canReadMaterial(doc,me))return json({error:'Dokumen tidak ditemui atau akses tidak dibenarkan.'},404);
   if(!doc.storageKey)return json({error:'Gunakan pautan asal untuk bahan ini.'},404);
   const object=await managementDrive({action:'management_download',id:doc.storageKey});if(!object.base64)return json({error:'Fail tidak ditemui. Hubungi pentadbir.'},404);
   const bytes=Uint8Array.from(atob(object.base64),c=>c.charCodeAt(0));
   const inline=['application/pdf','image/jpeg','image/png','image/webp'].includes(doc.mimeType)&&url.searchParams.get('download')!=='1';
   return new Response(bytes.buffer,{headers:{'Content-Type':doc.mimeType,'Content-Disposition':(inline?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(doc.originalName),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"}});
  }
  const requested=url.searchParams.get('year'),active=await db.prepare("SELECT school_year AS year FROM skas_years WHERE status='active' ORDER BY school_year DESC LIMIT 1").first<{year:number}>();
  const year=requested===null?(active?.year||new Date().getFullYear()):Number(requested);
  if(!validSchoolYear(year))return json({error:'Tahun tidak sah.'},400);
  const [years,docs]=await Promise.all([
   db.prepare('SELECT school_year AS year,status FROM skas_years ORDER BY school_year DESC').all(),
   db.prepare('SELECT '+columns+",s.status AS mappingStatus,s.standard_code AS standardCode FROM management_materials m LEFT JOIN skas_evidence s ON s.source_module=? AND s.source_record_id=m.id WHERE m.deleted_at='' AND m.school_year=? AND (m.visibility='staff' OR m.owner_email=? OR ?=1) ORDER BY m.created_at DESC").bind(managementSource,year,me.email,isManagementAdmin(me.role)?1:0).all<Material>(),
  ]);
  return json({year,years:years.results,materials:docs.results.map(({storageKey,...doc}:Material)=>({...doc,canDelete:canDeleteMaterial(doc,me),uploaded:Boolean(storageKey),openUrl:storageKey?'/api/pengurusan?file='+encodeURIComponent(doc.id):safeMaterialUrl(doc.sourceUrl)}))});
 }catch(error){console.error('Management read',error);return json({error:'Bahan pengurusan belum dapat dibaca. Cuba semula; rekod tidak dipadam.'},500);}
}
export async function POST(request:Request){
 let uploadedKey='';
 try{
  if(!sameOrigin(request))return json({error:'Permintaan tidak dibenarkan.'},403);
  const me=await portalActor(request);if(!me)return json({error:'Sila log masuk dengan akaun sekolah.'},401);
  const {db}=managementStore();
  if(Number(request.headers.get('content-length')||0)>9_000_000)return json({error:'Maksimum 8 MB bagi setiap fail.'},413);
  const multipart=(request.headers.get('content-type')||'').includes('multipart/form-data');
  const form=multipart?await request.formData():null;
  const input=(form?Object.fromEntries([...form.entries()].filter(([k])=>k!=='file')):await request.json()) as Record<string,unknown>;
  if(input.action==='map'){
   if(!isManagementAdmin(me.role))return json({error:'Pemetaan hanya untuk pentadbir.'},403);
   const doc=await row(text(input.id,80));if(!doc)return json({error:'Bahan tidak ditemui.'},404);
   await assertOpenYear(doc.schoolYear);
   const standard=text(input.standardCode,20),domain=mappingDomain(standard),unit=text(input.unitName,120);
   if(!skasStandards.some(([code])=>code===standard)||!domain||!unit)return json({error:'Pilih standard dan unit pemetaan.'},400);
   const now=new Date().toISOString(),sourceUrl=doc.storageKey?new URL('/api/pengurusan?file='+encodeURIComponent(doc.id),request.url).href:safeMaterialUrl(doc.sourceUrl);
   await db.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,notes,status,submitted_by_email,submitted_by_name,source_module,source_record_id,created_at,updated_at) SELECT ?,?,?,?,?,?,?,'portal',?,?,'pending',?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM management_materials WHERE id=? AND deleted_at='') ON CONFLICT DO NOTHING")
    .bind(crypto.randomUUID(),doc.schoolYear,domain,unit,doc.documentType,doc.title,standard,sourceUrl,doc.notes,doc.ownerEmail,doc.ownerName,managementSource,doc.id,now,now,doc.id).run();
   return json({success:true,message:'Pemetaan disimpan. Perakuan dibuat di Pusat SK@S.'});
  }
  const year=Number(input.schoolYear),folder=managementFolders.find(f=>f.id===text(input.folderId,80)),title=text(input.title),documentType=text(input.documentType,120),notes=text(input.notes,1800),visibility=input.visibility==='staff'?'staff':'private',id=text(input.id,80);
  if(!validSchoolYear(year)||!folder||!title||!managementDocumentTypes.includes(documentType)||!/^[-a-f0-9]{36}$/i.test(id))throw new Error('Lengkapkan tajuk, folder, jenis dokumen dan tahun.');
  await assertOpenYear(year);
  const removed=await db.prepare("SELECT id FROM management_materials WHERE id=? AND deleted_at!=''").bind(id).first();
  if(removed)return json({error:'Bahan ini telah dipadam. Buka borang baharu jika mahu menambah bahan lain.'},409);
  const existing=await row(id);if(existing){if(existing.ownerEmail!==me.email)return json({error:'Rujukan tidak sah.'},409);return json({success:true,id});}
  const file=form?.get('file');let mimeType='',originalName='',sourceUrl=safeMaterialUrl(text(input.sourceUrl,1800));
  if(file instanceof File&&file.size){
   const types:Record<string,string>={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.openxmlformats-officedocument.presentationml.presentation':'pptx'};
   if(file.size>8_000_000)throw new Error('Maksimum 8 MB bagi setiap fail. Fail besar boleh disimpan sebagai pautan Drive.');
   mimeType=file.type;if(!types[mimeType])throw new Error('Pilih PDF, JPG, PNG, WebP, DOCX, XLSX atau PPTX.');
   originalName=file.name.slice(0,180);
   const result=await managementDrive({action:'management_upload',requestId:id,path:[String(year),...managementPath(folder.id).split(' › '),documentType],name:originalName,mimeType,base64:encodeDriveBytes(await file.arrayBuffer())});
   if(!result.id||!result.url)throw new Error('Drive belum mengesahkan fail tersimpan. Cuba semula dengan borang yang sama.');
   uploadedKey=result.id;sourceUrl=result.url;
  }else if(!sourceUrl)throw new Error('Pilih fail atau masukkan pautan HTTPS yang sah.');
  await db.prepare('INSERT OR IGNORE INTO management_materials(id,school_year,folder_id,title,document_type,source_url,storage_key,mime_type,original_name,notes,visibility,owner_email,owner_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
   .bind(id,year,folder.id,title,documentType,sourceUrl,uploadedKey,mimeType,originalName,notes,visibility,me.email,me.name,new Date().toISOString()).run();
  uploadedKey='';return json({success:true,id});
 }catch(error){console.error('Management write',error);return json({error:error instanceof Error?error.message:'Bahan tidak dapat disimpan.'},400);}
}
export async function DELETE(request:Request){
 try{
  if(!sameOrigin(request))return json({error:'Permintaan tidak dibenarkan.'},403);
  const me=await portalActor(request);if(!me)return json({error:'Sila log masuk dengan akaun sekolah.'},401);
  const id=text(new URL(request.url).searchParams.get('id'),80),doc=await row(id);
  if(!doc)return json({success:true});
  if(!canDeleteMaterial(doc,me))return json({error:'Hanya pemilik bahan atau pentadbir boleh memadam.'},403);
  if(!isManagementAdmin(me.role))await assertOpenYear(doc.schoolYear);
  if(doc.storageKey)await managementDrive({action:'management_trash',id:doc.storageKey,requestId:doc.id});
  const now=new Date().toISOString(),{db}=managementStore();
  await db.batch([
   db.prepare("UPDATE management_materials SET deleted_at=?,deleted_by=? WHERE id=? AND deleted_at=''").bind(now,me.email,doc.id),
   db.prepare("UPDATE skas_evidence SET status='source_deleted',updated_at=? WHERE source_module=? AND source_record_id=?").bind(now,managementSource,doc.id),
  ]);
  return json({success:true,message:doc.storageKey?'Bahan dipadam. Fail dipindahkan ke Trash Google Drive.':'Pautan dipadam daripada portal. Fail asal tidak disentuh.'});
 }catch(error){console.error('Management delete',error);return json({error:'Pemadaman belum dapat disahkan. Cuba semula; jangan tambah bahan yang sama.'},500);}
}
