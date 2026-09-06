import {portalActor} from '../../server-auth';
import {managementStore} from '../../management-store';
import {resolveOprManagement,oprSchoolYear} from '../../opr-management-routing';
import {safeMaterialUrl,validSchoolYear} from '../../management-model';

export async function GET(request:Request){
 const me=await portalActor(request);
 if(!me)return Response.json({error:'Sila log masuk dengan akaun sekolah.'},{status:401});
 const year=Number(new URL(request.url).searchParams.get('year'));
 if(!validSchoolYear(year))return Response.json({error:'Tahun tidak sah.'},{status:400});
 try{
  const rows=await managementStore().db.prepare("SELECT r.id,r.name,r.category,r.view_url AS viewUrl,COALESCE(m.payload_json,'{}') AS payload,s.status AS mappingStatus,s.standard_code AS standardCode FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id LEFT JOIN skas_evidence s ON s.source_module='OPR' AND s.source_record_id=r.id WHERE r.category NOT LIKE 'Lain-lain%' AND (m.report_id IS NOT NULL OR r.name LIKE '%.pdf') ORDER BY r.created_at DESC").all<{id:string;name:string;category:string;viewUrl:string;payload:string;mappingStatus:string;standardCode:string}>();
  const reports=rows.results.flatMap(row=>{
   let payload:Record<string,unknown>={};try{payload=JSON.parse(row.payload);}catch{}
   const schoolYear=oprSchoolYear(payload,row.name);
   if(schoolYear!==year)return [];
   const title=typeof payload.title==='string'&&payload.title.trim()?payload.title:row.name;
   const destination=resolveOprManagement(row.category,title);
   return [{id:row.id,title,category:row.category,folderId:destination?.id||'',openUrl:safeMaterialUrl(row.viewUrl),mappingStatus:row.mappingStatus,standardCode:row.standardCode}];
  });
  return Response.json({reports},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('Linked OPR read',error);return Response.json({error:'Rujukan OPR belum dapat dibaca. Cuba semula.'},{status:500});}
}
