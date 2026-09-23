import { env } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
import { buildAbsenceSummaryPdf, malaysiaClock, type AbsenceSummaryRow } from '../../lib/absence-summary-pdf';
import { managementDrive, encodeDriveBytes } from '../../management-drive';
import { managementPath } from '../../management-catalog';

const folderId='pengurusan-21-1';
const documentType='Analisis, laporan atau keberhasilan';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
  const secret=process.env.OPR_APPS_SCRIPT_TOKEN||'';
  const provided=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  const a=Buffer.from(secret),b=Buffer.from(provided);
  if(!a.length||a.length!==b.length||!timingSafeEqual(a,b))return reply({ok:false,error:'Unauthorized'},401);
  try{
    const input=await request.json() as {mode?:string};
    const clock=malaysiaClock();
    if(input.mode==='check')return reply({ok:true,date:clock.date,time:clock.time,scheduledTime:'12:30',timeZone:'Asia/Kuala_Lumpur',folder:managementPath(folderId)});
    if(clock.time<'12:30')return reply({ok:true,status:'not_due',date:clock.date});
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('absence-summary:'+clock.date)))).map(n=>n.toString(16).padStart(2,'0')).join('');
    const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
    const existing=await env.DB.prepare('SELECT id,deleted_at FROM management_materials WHERE id=?').bind(id).first<{id:string;deleted_at:string}>();
    if(existing)return reply({ok:true,status:existing.deleted_at?'previously_deleted':'already_archived',date:clock.date,id});
    const now=new Date().toISOString(),year=Number(clock.date.slice(0,4));
    const title='Rumusan Keberadaan Guru - '+clock.date,name=title+'.pdf';
    const key=`absence-summaries/${clock.date}.pdf`;
    let object=await env.FILES.get(key);
    let bytes:ArrayBuffer;
    if(object)bytes=await object.arrayBuffer();
    else{
      const result=await env.DB.prepare("SELECT teacher_name AS teacherName,absence_date AS absenceDate,end_date AS endDate,reason,note FROM absences WHERE absence_date<=? AND COALESCE(NULLIF(end_date,''),absence_date)>=? ORDER BY teacher_name,id").bind(clock.date,clock.date).all<AbsenceSummaryRow>();
      bytes=buildAbsenceSummaryPdf(clock.date,result.results);
      await env.FILES.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
    }
    const file=await managementDrive({action:'management_upload',requestId:id,path:[String(year),...managementPath(folderId).split(' › '),documentType],name,mimeType:'application/pdf',base64:encodeDriveBytes(bytes)});
    if(!file.id||!file.url)throw new Error('Drive belum mengesahkan fail');
    await env.DB.batch([
      env.DB.prepare("INSERT INTO management_materials(id,school_year,folder_id,title,document_type,source_url,storage_key,mime_type,original_name,notes,visibility,owner_email,owner_name,created_at) VALUES(?,?,?,?,?,?,?,'application/pdf',?,?,'private',?,'Sistem e-Keberadaan',?) ON CONFLICT(id) DO NOTHING").bind(id,year,folderId,title,documentType,file.url,file.id,name,'Rumusan harian berjadual 12.30 tengah hari waktu Malaysia.','sekolah-2508@moe-dl.edu.my',now),
      env.DB.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,notes,status,submitted_by_email,submitted_by_name,source_module,source_record_id,created_at,updated_at) VALUES(?,?,'Pengurusan','Sumber Manusia',?,?,'2','portal',?,?,'pending',?,'Sistem e-Keberadaan','PENGURUSAN SEKOLAH',?,?,?) ON CONFLICT DO NOTHING").bind(id,year,documentType,title,file.url,'Rumusan keberadaan harian; calon evidens menunggu perakuan pentadbir.','sekolah-2508@moe-dl.edu.my',id,now,now),
    ]);
    return reply({ok:true,status:'archived',date:clock.date,id});
  }catch(error){console.error('Absence summary job failed',error instanceof Error?error.message:'Unknown');return reply({ok:false,error:'Rumusan belum lengkap; penjadual akan mencuba semula.'},503);}
}
