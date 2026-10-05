import {env} from 'cloudflare:workers';
import {malaysiaDay,teachingDay,documentNameKey,matchDocumentUserId,matchReliefTeacherId,type ReliefAssignment} from '../staff-work-model';
import {form6Lessons,type Form6Data} from '../form6-model';
import {applyMainstreamTimes} from '../mainstream-times';
import {staffNameMappings} from './staff-name-mappings';
import {sendTaskNotices,type TaskNotice} from './task-push';
import {morningDue,morningBody,reliefReadyBody,TASKS_URL} from '../daily-notice-model';
export async function announceRelief(date:string){
 if(date!==malaysiaDay())return;
 const users=await env.DB.prepare("SELECT DISTINCT u.id FROM portal_users u JOIN push_subscriptions s ON s.user_id=u.id WHERE u.status='active' AND u.deleted_at IS NULL").all<{id:string}>();
 await sendTaskNotices(users.results.map(u=>({userId:u.id,taskId:`relief-ready:${date}`,title:'Jadual relief telah disediakan',body:reliefReadyBody(date),url:TASKS_URL,ttl:3600})));
}
export async function sendMorningSummaries(now=new Date()){
 if(!morningDue(now))return;
 const today=malaysiaDay(now);
 const [users,schedule,timing,f6,plan,assignments,subscribed]=await Promise.all([
 env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL").all<{id:string;name:string}>(),
 env.DB.prepare("SELECT teachers_json FROM relief_schedules WHERE is_active='1' ORDER BY created_at DESC,rowid DESC LIMIT 1").first<{teachers_json:string}>(),
 env.DB.prepare("SELECT data_json FROM mainstream_times WHERE id='active'").first<{data_json:string}>(),
 env.DB.prepare("SELECT data_json FROM form6_timetable WHERE id='active'").first<{data_json:string}>(),
 env.DB.prepare("SELECT assignments_json FROM relief_plans WHERE date=? ORDER BY rowid DESC LIMIT 1").bind(today).first<{assignments_json:string}>(),
 env.DB.prepare("SELECT a.user_id,d.kind FROM staff_work_assignments a JOIN staff_work_documents d ON d.id=a.document_id WHERE d.published=1 AND a.start_date<>'' AND a.start_date<=? AND (a.end_date='' OR a.end_date>=?)").bind(today,today).all<{user_id:string;kind:string}>(),
 env.DB.prepare('SELECT DISTINCT user_id FROM push_subscriptions').all<{user_id:string}>()]);
 const mappings=await staffNameMappings(),teachers=schedule?JSON.parse(schedule.teachers_json):null,times=timing?JSON.parse(timing.data_json):null,form6:Form6Data|null=f6?JSON.parse(f6.data_json):null,relief:ReliefAssignment[]=plan?JSON.parse(plan.assignments_json):[];
 if(Array.isArray(teachers))for(const teacher of teachers){if(typeof teacher?.name==='string'){const key=documentNameKey(teacher.name);if(!mappings[key])mappings[key]=matchDocumentUserId(teacher.name,users.results)||'__unmatched__';}}
 const ids=new Set(subscribed.results.map(u=>u.user_id)),notices:TaskNotice[]=[];
 for(const actor of users.results.filter(u=>ids.has(u.id))){
 let day=teachingDay(teachers,actor,users.results,now,mappings);if(times)day=applyMainstreamTimes(day,times);const sixth=form6?form6Lessons(form6,actor.id,day.day):null;if(sixth)day={...day,state:'ready',lessons:sixth};
 const teacherId=matchReliefTeacherId(relief,actor,users.results,mappings),reliefs=teacherId?relief.filter(r=>r&&!r.cancelled&&r.reliefId===teacherId).length:0,own=assignments.results.filter(a=>a.user_id===actor.id);
 const duty=own.filter(a=>a.kind==='duty').length,other=own.filter(a=>a.kind!=='duty').length;
 // A merged lesson may span multiple teaching periods; count each period once.
 const periods=new Set(day.lessons.flatMap(l=>Array.from({length:Math.max(0,l.end-l.start+1)},(_,i)=>l.start+i)));
 if(day.state!=='ready'&&!reliefs&&!duty&&!other)continue;
 notices.push({userId:actor.id,taskId:`morning-summary:${today}:${actor.id}`,title:'Ringkasan Tugasan Saya',body:morningBody(actor.name,day.state==='ready'?periods.size:null,plan?reliefs:null,duty,other),url:TASKS_URL,ttl:3600});
 }
 await sendTaskNotices(notices);
}
