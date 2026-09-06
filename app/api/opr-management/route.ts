import {isPrimaryReport} from '../../report-kind';
import {achievementCategory,achievementInfo,achievementFolder} from '../../achievement-mapping';
import {monitoringCategory,monitoringTitle,resolveMonitoring} from '../../monitoring-mapping';
import {portalActor} from '../../server-auth';
import {managementStore} from '../../management-store';
import {resolveOprManagement,oprSchoolYear,linkedManagementFolder} from '../../opr-management-routing';
import {safeMaterialUrl,validSchoolYear} from '../../management-model';

export async function GET(request:Request){
 const me=await portalActor(request);
 if(!me)return Response.json({error:'Sila log masuk dengan akaun sekolah.'},{status:401});
 const year=Number(new URL(request.url).searchParams.get('year'));
 if(!validSchoolYear(year))return Response.json({error:'Tahun tidak sah.'},{status:400});
 try{
  const rows=await managementStore().db.prepare("SELECT r.id,r.name,r.category,r.view_url AS viewUrl,COALESCE(m.payload_json,'{}') AS payload,s.status AS mappingStatus,s.standard_code AS standardCode,s.domain AS mappedDomain,s.unit_name AS mappedUnit,s.notes AS mappingNotes,s.school_year AS mappingYear FROM opr_reports r LEFT JOIN opr_intake_metadata m ON m.report_id=r.id LEFT JOIN skas_evidence s ON s.source_module IN ('OPR','e-Pemantauan','Arkib Kejayaan') AND s.source_record_id=r.id WHERE (r.category NOT LIKE 'Lain-lain%' OR r.category='Lain-lain · e-Pemantauan' OR r.category='Lain-lain · Arkib Kejayaan') AND (m.report_id IS NOT NULL OR r.name LIKE '%.pdf' OR r.category='Lain-lain · Arkib Kejayaan') ORDER BY r.created_at DESC").all<{id:string;name:string;category:string;viewUrl:string;payload:string;mappingStatus:string;standardCode:string;mappedDomain:string;mappedUnit:string;mappingNotes:string;mappingYear:number}>();
  const reports=rows.results.filter(isPrimaryReport).flatMap(row=>{
   let payload:Record<string,unknown>={};try{payload=JSON.parse(row.payload);}catch{}
   const schoolYear=oprSchoolYear(payload,row.name);
   if(schoolYear!==year)return [];
   const isMonitoring=row.category===monitoringCategory;
   const isAchievement=row.category===achievementCategory,achievement=achievementInfo(row.name,payload);
   const title=typeof payload.title==='string'&&payload.title.trim()?payload.title:isMonitoring?monitoringTitle(row.name):row.name;
   const destination=isMonitoring?null:resolveOprManagement(isAchievement?achievement.unitCategory:row.category,title);
   const folderId=isMonitoring?resolveMonitoring(title,payload)?.folderId:destination?.id||(isAchievement&&!achievement.unitCategory?achievementFolder(achievement.field):'');
   const chosen=linkedManagementFolder(folderId||'',{domain:row.mappedDomain,unit:row.mappedUnit,notes:row.mappingYear===year?row.mappingNotes:'',status:row.mappingStatus});
   return [{id:row.id,title:isAchievement?achievement.title:title,category:row.category,folderId:chosen.folderId,mappingBasis:chosen.basis,sourceModule:isAchievement?'Arkib Kejayaan':isMonitoring?'e-Pemantauan':'OPR',openUrl:safeMaterialUrl(row.viewUrl),mappingStatus:row.mappingStatus,standardCode:row.standardCode}];
  });
  return Response.json({reports},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('Linked OPR read',error);return Response.json({error:'Rujukan OPR belum dapat dibaca. Cuba semula.'},{status:500});}
}
