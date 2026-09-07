import {isPrimaryReport} from '../../report-kind';
import {achievementCategory,achievementInfo,achievementFolder} from '../../achievement-mapping';
import {monitoringCategory,monitoringTitle,resolveMonitoring} from '../../monitoring-mapping';
import {portalActor} from '../../server-auth';
import {managementStore} from '../../management-store';
import {resolveOprManagement,oprSchoolYear} from '../../opr-management-routing';
import {isManagementAdmin,safeMaterialUrl,validSchoolYear} from '../../management-model';

import {managementFolders,managementDocumentTypes} from '../../management-catalog';

export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Permintaan tidak dibenarkan.'},{status:403});
 const me=await portalActor(request);
 if(!me)return Response.json({error:'Sila log masuk.'},{status:401});
 if(!isManagementAdmin(me.role))return Response.json({error:'Hanya pentadbir boleh mengubah folder.'},{status:403});
 try{
  const {id,folderId,documentType}=await request.json();
  if(typeof id!=='string'||!managementFolders.some(f=>f.id===folderId))return Response.json({error:'Pilih folder yang sah.'},{status:400});
  if(documentType!==undefined&&!managementDocumentTypes.includes(documentType))return Response.json({error:'Jenis dokumen tidak sah.'},{status:400});
  const db=managementStore().db;
  const row=await db.prepare("SELECT r.name,r.category,COALESCE(m.payload_json,'{}') AS payload FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id WHERE r.id=?").bind(id).first<{name:string;category:string;payload:string}>();
  if(!row||!isPrimaryReport(row))return Response.json({error:'Laporan tidak ditemui.'},{status:404});
  let payload={};try{payload=JSON.parse(row.payload);}catch{}
  const year=oprSchoolYear(payload,row.name);
  const state=await db.prepare('SELECT status FROM skas_years WHERE school_year=?').bind(year).first<{status:string}>();
  if(!state||state.status==='closed')return Response.json({error:'Tahun belum dibuka atau telah ditutup.'},{status:409});
  await db.prepare('INSERT INTO management_report_folders (report_id,folder_id,document_type,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(report_id) DO UPDATE SET folder_id=excluded.folder_id,document_type=excluded.document_type,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(id,folderId,documentType||'',me.email,new Date().toISOString()).run();
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('Management folder save',error);return Response.json({error:'Folder belum dapat disimpan. Cuba semula.'},{status:500});}
}

export async function GET(request:Request){
 const me=await portalActor(request);
 if(!me)return Response.json({error:'Sila log masuk dengan akaun sekolah.'},{status:401});
 const year=Number(new URL(request.url).searchParams.get('year'));
 if(!validSchoolYear(year))return Response.json({error:'Tahun tidak sah.'},{status:400});
 try{
  const rows=await managementStore().db.prepare("SELECT r.id,r.name,r.category,r.view_url AS viewUrl,COALESCE(m.payload_json,'{}') AS payload,f.folder_id AS manualFolder,f.document_type AS documentType FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id LEFT JOIN management_report_folders f ON f.report_id=r.id WHERE (r.category NOT LIKE 'Lain-lain%' OR r.category='Lain-lain · e-Pemantauan' OR r.category='Lain-lain · Arkib Kejayaan') AND (m.report_id IS NOT NULL OR r.name LIKE '%.pdf' OR r.category='Lain-lain · Arkib Kejayaan') ORDER BY r.created_at DESC").all<{id:string;name:string;category:string;viewUrl:string;payload:string;manualFolder:string;documentType:string}>();
  const reports=rows.results.filter(isPrimaryReport).flatMap(row=>{
   let payload:Record<string,unknown>={};try{payload=JSON.parse(row.payload);}catch{}
   const schoolYear=oprSchoolYear(payload,row.name);
   if(schoolYear!==year)return [];
   const isMonitoring=row.category===monitoringCategory;
   const isAchievement=row.category===achievementCategory,achievement=achievementInfo(row.name,payload);
   const title=typeof payload.title==='string'&&payload.title.trim()?payload.title:isMonitoring?monitoringTitle(row.name):row.name;
   const destination=isMonitoring?null:resolveOprManagement(isAchievement?achievement.unitCategory:row.category,title);
   const folderId=isMonitoring?resolveMonitoring(title,payload)?.folderId:destination?.id||(isAchievement&&!achievement.unitCategory?achievementFolder(achievement.field):'');
   const chosen={folderId:managementFolders.some(f=>f.id===row.manualFolder)?row.manualFolder:folderId||'',basis:row.manualFolder?'manual':'source'};
   return [{documentType:managementDocumentTypes.includes(row.documentType)?row.documentType:isAchievement?'Sijil, keputusan atau pengiktirafan':isMonitoring?'Pemantauan dan penambahbaikan':'Program, aktiviti atau OPR',id:row.id,title:isAchievement?achievement.title:title,category:row.category,folderId:chosen.folderId,mappingBasis:chosen.basis,sourceModule:isAchievement?'Arkib Kejayaan':isMonitoring?'e-Pemantauan':'OPR',openUrl:safeMaterialUrl(row.viewUrl)}];
  });
  return Response.json({reports},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('Linked OPR read',error);return Response.json({error:'Rujukan OPR belum dapat dibaca. Cuba semula.'},{status:500});}
}
