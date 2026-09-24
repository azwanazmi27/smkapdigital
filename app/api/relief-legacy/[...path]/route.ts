import { env, waitUntil } from "cloudflare:workers";
import { NextRequest } from "next/server";
import { markAbsenceDeletedInSheet, upsertAbsenceToSheet } from "../../../lib/google-sheets";
import { managementDrive } from "../../../management-drive";
import { managementPath } from "../../../management-catalog";
import { syncTeacherReview } from "../../../lib/teacher-review";
import { verifyReliefPin } from "../../../lib/relief-pin";
import { verifyDeletePassword } from "../../../lib/relief-delete-password";
import { malaysiaDay, matchReliefTeacherId, reliefTasksForTeacher, reliefVisibleNow, type ReliefAssignment, type ReliefPlan } from "../../../staff-work-model";
import { sendTaskNotices, type TaskNotice } from "../../../lib/task-push";
import { portalActor } from "../../../server-auth";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}}); const text=(v:unknown)=>typeof v==="string"?v.trim():"";
async function parts(c:{params:Promise<{path:string[]}>}){return (await c.params).path||[]}
const reliefFolderId="kurikulum-7";
const defaultReliefSettings={params:{maxRelief:3,maxLoad:8,consecutiveLimit:3,historyWeight:12,dayWeight:5},excludedNames:[],excludedClasses:[],coordinators:["AYUNI","SYIKIN","NAJIB","RAZLY","AINAA","AINUL HUSNA"]};
async function reliefSettings(){const row=await env.DB.prepare("SELECT payload_json FROM relief_settings WHERE id='active'").first<{payload_json:string}>();try{return {...defaultReliefSettings,...(row?JSON.parse(row.payload_json):{})} as Record<string,unknown>}catch{return defaultReliefSettings as Record<string,unknown>}}
function coordinatorNames(value:unknown){return [...new Set((Array.isArray(value)?value:[]).map(name=>text(name).replace(/\s+/g," ").slice(0,120)).filter(Boolean))].slice(0,50)}

async function archiveGeneratedReliefPdf(input:{id:string;date:unknown;day:unknown;createdBy:unknown;fileName:unknown;pdfBase64:string;now:string}){
 const year=Number(String(input.date).slice(0,4)),schoolYear=Number.isInteger(year)&&year>=2020&&year<=2100?year:new Date().getFullYear();
 const day=text(input.day).slice(0,40)||"Jadual Relief";
 const originalName=((text(input.fileName).replace(/[\\/:*?"<>|]/g,"-").slice(0,180)||"Jadual-Relief-"+input.date+".pdf").replace(/\.pdf$/i,""))+".pdf";
 const title=("Jadual Relief — "+day+" "+text(input.date).slice(0,10)).slice(0,180);
 const result=await managementDrive({action:"management_upload",requestId:input.id,path:[String(schoolYear),...managementPath(reliefFolderId).split(" › "),"Analisis, laporan atau keberhasilan"],name:originalName,mimeType:"application/pdf",base64:input.pdfBase64});
 if(!result.id||!result.url)throw new Error("Drive belum mengesahkan PDF relief. Cuba simpan pelan sekali lagi.");
 await env.DB.prepare("INSERT OR IGNORE INTO management_materials(id,school_year,folder_id,title,document_type,source_url,storage_key,mime_type,original_name,notes,visibility,owner_email,owner_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  .bind(input.id,schoolYear,reliefFolderId,title,"Analisis, laporan atau keberhasilan",result.url,result.id,"application/pdf",originalName,"Jadual relief dijana oleh Sistem Relief.","staff","",text(input.createdBy).slice(0,180)||"Sistem Relief",input.now).run();
 await env.DB.prepare("INSERT INTO skas_evidence(id,school_year,domain,unit_name,evidence_type,title,standard_code,source_type,source_url,storage_key,mime_type,original_name,notes,status,submitted_by_email,submitted_by_name,verified_by_email,verified_by_name,verified_at,source_module,source_record_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'portal',?,'','','',?,'pending','',?,'','','','PENGURUSAN SEKOLAH',?,?,?) ON CONFLICT DO NOTHING")
  .bind(crypto.randomUUID(),schoolYear,"Kurikulum","Jadual Waktu dan Guru Ganti (MMI)","Analisis, laporan atau keberhasilan",title,"3.1",result.url,"Jadual relief dijana secara automatik dan menunggu perakuan pentadbir.",text(input.createdBy).slice(0,180)||"Sistem Relief",input.id,input.now,input.now).run();
}
export async function GET(request:NextRequest,c:{params:Promise<{path:string[]}>}){const p=await parts(c),root=p[0];
 if(root==="teachers"){const x=await env.DB.prepare("SELECT id,name,category,created_at AS createdAt FROM teachers ORDER BY category,name").all();return json({teachers:x.results})}
 if(root==="absences"){const x=await env.DB.prepare("SELECT id,teacher_id AS teacherId,teacher_name AS teacherName,category,absence_date AS absenceDate,end_date AS endDate,reason,duration,start_time AS startTime,end_time AS endTime,note,relief_status AS reliefStatus,created_at AS createdAt,updated_at AS updatedAt FROM absences ORDER BY absence_date DESC,created_at DESC").all();return json({records:x.results})}
 if(root==="absence-inbox"){const x=await env.DB.prepare("SELECT a.id,a.teacher_id,COALESCE(t.name,a.teacher_name) AS teacher_name,a.category,a.absence_date,a.end_date,a.reason,a.duration,a.start_time,a.end_time,a.note,a.relief_status AS status,CAST(strftime('%s',a.created_at) AS INTEGER) AS created_at,CAST(strftime('%s',a.updated_at) AS INTEGER) AS updated_at FROM absences a LEFT JOIN teachers t ON t.id=a.teacher_id ORDER BY a.absence_date DESC,a.created_at DESC").all();return json({reports:x.results})}
 if(root==="schedules"){const x=await env.DB.prepare("SELECT * FROM relief_schedules ORDER BY created_at DESC").all();return json({versions:x.results.map((r:any)=>({id:r.id,fileName:r.file_name,sourceLabel:r.source_label,teacherCount:Number(r.teacher_count),isActive:r.is_active==="1",createdAt:r.created_at,teachers:JSON.parse(r.teachers_json)}))})}
 if(root==="settings")return json(await reliefSettings())
 if(root==="coordinators"){const settings=await reliefSettings();return json({coordinators:coordinatorNames(settings.coordinators)})}
 if(root==="relief-plans"&&p[2]==="pdf"){const f=await env.FILES.get(`relief-pdfs/${p[1]}.pdf`);return f?new Response(f.body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${p[1]}.pdf"`}}):json({error:"PDF tidak ditemui"},404)}
 if(root==="relief-plans"){const x=await env.DB.prepare("SELECT * FROM relief_plans ORDER BY date DESC,created_at DESC").all();return json({plans:x.results.map((r:any)=>({id:r.id,date:r.date,day:r.day,createdBy:r.created_by,assignments:JSON.parse(r.assignments_json),fileName:r.file_name,createdAt:r.created_at,pdfUrl:`/api/relief-legacy/relief-plans/${r.id}/pdf`}))})}
 return json({error:"Laluan tidak ditemui"},404)}
export async function POST(request:NextRequest,c:{params:Promise<{path:string[]}>}){const p=await parts(c),root=p[0];
 if(root==="access"&&p[1]==="verify")return new Response(null,{status:await verifyReliefPin(request.headers.get("x-access-pin"))?204:401});
 if(root==="admin"&&p[1]==="verify")return new Response(null,{status:await verifyReliefPin(request.headers.get("x-admin-pin"))?204:401});
 const b=await request.json() as Record<string,any>,now=new Date().toISOString();
 if(root==="coordinators"){if(!await verifyReliefPin(request.headers.get("x-admin-pin")))return json({error:"PIN pentadbir diperlukan."},401);const coordinators=coordinatorNames(b.coordinators);if(!coordinators.length)return json({error:"Tambah sekurang-kurangnya seorang penyelaras."},400);const settings=await reliefSettings();await env.DB.prepare("INSERT INTO relief_settings (id,payload_json,updated_at) VALUES ('active',?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at").bind(JSON.stringify({...settings,coordinators}),now).run();return json({coordinators})}
 if(root==="absences") {const teacher=await env.DB.prepare("SELECT id,name,category FROM teachers WHERE id=?").bind(text(b.teacherId)).first<{id:string;name:string;category:string}>();if(!teacher)return json({error:"Nama guru belum disahkan oleh pentadbir."},400);b.teacherName=teacher.name;b.category=teacher.category;}
 if(root==="absences"){const id=text(b.id)||crypto.randomUUID(),record={id,teacherId:text(b.teacherId),teacherName:text(b.teacherName),category:text(b.category),absenceDate:text(b.absenceDate),endDate:text(b.endDate)||null,reason:text(b.reason),duration:text(b.duration),startTime:text(b.startTime)||null,endTime:text(b.endTime)||null,note:text(b.note),reliefStatus:"pending",createdAt:now,updatedAt:now};await env.DB.prepare("INSERT INTO absences (id,teacher_id,teacher_name,category,absence_date,end_date,reason,duration,start_time,end_time,note,relief_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,record.teacherId,record.teacherName,record.category,record.absenceDate,record.endDate,record.reason,record.duration,record.startTime,record.endTime,record.note,"pending",now,now).run();const sheetMirrored=await upsertAbsenceToSheet(record);return json({id,status:"pending",sheetMirrored})}
 if(root==="teachers"){if(!await verifyReliefPin(request.headers.get("x-admin-pin")))return json({error:"PIN pentadbir diperlukan."},401);if(!text(b.name)||!["mainstream","form6"].includes(b.category))return json({error:"Nama dan kumpulan guru diperlukan."},400);const id=text(b.id)||crypto.randomUUID();await env.DB.prepare("INSERT INTO teachers (id,name,category,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category").bind(id,text(b.name),b.category,now).run();return json({id})}
 if(root==="schedules"){const id=crypto.randomUUID(),teachers=Array.isArray(b.teachers)?b.teachers:[];if(!teachers.length)return json({error:"Jadual tidak mengandungi nama guru."},400);await env.DB.batch([env.DB.prepare("UPDATE relief_schedules SET is_active='0'"),env.DB.prepare("INSERT INTO relief_schedules (id,file_name,source_label,teacher_count,is_active,teachers_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(id,b.fileName,b.sourceLabel||b.fileName,String(teachers.length),"1",JSON.stringify(teachers),now)]);await syncTeacherReview(env.DB,id,b.sourceLabel||b.fileName,teachers);return json({id,teacherReviewRequired:true})}
 if(root==="settings"){const payload={params:b.params||{},excludedNames:b.excludedNames||[],excludedClasses:b.excludedClasses||[]};await env.DB.prepare("INSERT INTO relief_settings (id,payload_json,updated_at) VALUES ('active',?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at").bind(JSON.stringify(payload),now).run();return json({ok:true})}
if(root==="relief-plans"){
 const id=crypto.randomUUID(),pdf=text(b.pdfBase64),publishedAt=new Date();
 const currentDay=b.date===malaysiaDay(publishedAt)&&reliefVisibleNow(publishedAt);
 const previous=currentDay?await env.DB.prepare("SELECT assignments_json AS assignmentsJson,file_name AS fileName FROM relief_plans WHERE date=? ORDER BY rowid DESC LIMIT 1").bind(b.date).first<{assignmentsJson:string;fileName:string}>():null;
 if(pdf){await archiveGeneratedReliefPdf({id,date:b.date,day:b.day,createdBy:b.createdBy,fileName:b.fileName,pdfBase64:pdf,now});await env.FILES.put(`relief-pdfs/${id}.pdf`,Uint8Array.from(atob(pdf),x=>x.charCodeAt(0)),{httpMetadata:{contentType:"application/pdf"}})}
 await env.DB.prepare("INSERT INTO relief_plans (id,date,day,created_by,assignments_json,file_name,created_at) VALUES (?,?,?,?,?,?,?)").bind(id,b.date,b.day,b.createdBy,JSON.stringify(b.assignments||[]),b.fileName||`${id}.pdf`,now).run();
 // Notification side effects require a signed-in portal account. The existing
 // relief publication flow remains available to its PIN-protected client.
 if(currentDay&&Array.isArray(b.assignments))try{
  if(!await portalActor(request))throw new Error('Relief publisher has no portal session; push skipped');
  const users:{id:string;name:string}[]=(await env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL").all()).results;
  const subscribed:{userId:string}[]=(await env.DB.prepare('SELECT DISTINCT user_id AS userId FROM push_subscriptions').all()).results;
  const next:ReliefPlan={date:b.date,fileName:text(b.fileName),assignments:b.assignments as ReliefAssignment[]};
  let oldAssignments:ReliefAssignment[]=[];try{const parsed=JSON.parse(previous?.assignmentsJson||'[]');if(Array.isArray(parsed))oldAssignments=parsed;}catch{ /* Bad historical plan cannot block publication. */ }
  const notices:TaskNotice[]=[];
  for(const {userId} of subscribed){const user=users.find(item=>item.id===userId);if(!user)continue;
   const teacherId=matchReliefTeacherId(next.assignments,user,users);if(!teacherId)continue;
   const oldTeacherId=matchReliefTeacherId(oldAssignments,user,users);
   const oldTasks=oldTeacherId?await reliefTasksForTeacher([{date:b.date,fileName:previous?.fileName||'',assignments:oldAssignments}],oldTeacherId,b.date,publishedAt):[];
   const oldIds=new Set(oldTasks.map(task=>task.id));
   for(const task of await reliefTasksForTeacher([next],teacherId,b.date,publishedAt))if(!oldIds.has(task.id))notices.push({userId,taskId:`relief-publish:${id}:${task.id}`,title:'Relief hari ini',body:`${task.context} · ${task.detail}`.slice(0,500),url:'/?module=warga'});
  }
  waitUntil(sendTaskNotices(notices).catch(error=>console.error('Relief task push delivery failed',error)));
 }catch(error){console.error('Relief task notification failed',error)}
 return json({plan:{id,date:b.date,day:b.day,createdBy:b.createdBy,assignments:b.assignments||[],fileName:b.fileName,createdAt:now,pdfUrl:`/api/relief-legacy/relief-plans/${id}/pdf`}})}
 return json({error:"Laluan tidak ditemui"},404)}
export async function PUT(r:NextRequest,c:{params:Promise<{path:string[]}>}){return POST(r,c)}
export async function DELETE(request:NextRequest,c:{params:Promise<{path:string[]}>}){const p=await parts(c),root=p[0],id=p[1]||request.nextUrl.searchParams.get("id");if(root==="absences"&&!await verifyDeletePassword(request.headers.get("x-delete-password")))return json({error:"Kata laluan tidak betul"},401);if(root==="teachers"&&!await verifyReliefPin(request.headers.get("x-admin-pin")))return json({error:"PIN tidak betul"},401);if(!id)return json({error:"ID diperlukan"},400);let sheetMirrored=true;if(root==="absences"){await env.DB.prepare("DELETE FROM absences WHERE id=?").bind(id).run();sheetMirrored=await markAbsenceDeletedInSheet(id);}else if(root==="teachers")await env.DB.prepare("DELETE FROM teachers WHERE id=?").bind(id).run();else if(root==="schedules")await env.DB.prepare("DELETE FROM relief_schedules WHERE id=?").bind(id).run();else return json({error:"Laluan tidak ditemui"},404);return json({ok:true,sheetMirrored})}
