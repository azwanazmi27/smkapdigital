import {retryLessons,selectRetryNotices,type RetryTarget} from '../notification-retry-model';
import {notificationSettings} from './notification-settings';
import {env} from 'cloudflare:workers';
import {malaysiaDay,matchReliefTeacherId,reliefVisibleNow,type ReliefPlan} from '../staff-work-model';
import {timedReliefTasks} from '../relief-times';
import {dueClasses} from '../class-reminder-model';
import {staffNameMappings} from './staff-name-mappings';
import {sendTaskNotices,type TaskNotice,type PushBudget} from './task-push';
export async function sendReliefReminders(now=new Date(),budget?:PushBudget,target?:RetryTarget){
 const settings=await notificationSettings();if(!settings.reliefEnabled)return;
 if(!reliefVisibleNow(now))return;
 const today=malaysiaDay(now);
 // Re-read the latest plan on every run; never schedule against a superseded plan.
 const row=await env.DB.prepare("SELECT id,date,file_name AS fileName,assignments_json AS assignmentsJson FROM relief_plans WHERE date=? ORDER BY rowid DESC LIMIT 1").bind(today).first<{id:string;date:string;fileName:string;assignmentsJson:string}>();
 if(!row)return;
 const assignments=JSON.parse(row.assignmentsJson);if(!Array.isArray(assignments))return;
 const timing=await env.DB.prepare("SELECT data_json FROM mainstream_times WHERE id='active'").first<{data_json:string}>();if(!timing)return;
 const config=JSON.parse(timing.data_json),plan:ReliefPlan={...row,assignments};
 const users=(await env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL").all<{id:string;name:string}>()).results;
 const mappings=await staffNameMappings(),notices:TaskNotice[]=[];
 for(const actor of users.filter(u=>!target||u.id===target.userId)){const teacherId=matchReliefTeacherId(assignments,actor,users,mappings);if(!teacherId)continue;
  for(const {task,sessions,absentTeacher} of await timedReliefTasks(plan,teacherId,config,now)){
   for(const session of (target?retryLessons({date:today,day:'',state:'ready',lessons:sessions},now):dueClasses({date:today,day:'',state:'ready',lessons:sessions},now,settings.leadMinutes))){
    notices.push({userId:actor.id,taskId:`reminder:${task.id}:${actor.id}:${session.startTime}`,title:`Relief bermula dalam ${Math.max(1,Math.ceil((Date.parse(`${today}T${session.startTime}:00+08:00`)-now.getTime())/60000))} minit`,body:`${session.subject} · Kelas ${session.className.replace(/^Kelas\s+/i,'')}\n🕒 ${session.startTime}–${session.endTime}${absentTeacher?`\nGanti: Cikgu ${absentTeacher.replace(/^Cikgu\s+/i,'')}`:''}`,url:'/?module=warga&tasks=1',ttl:600});
   }
  }
 }
 await sendTaskNotices(selectRetryNotices(notices,target),budget);
}
