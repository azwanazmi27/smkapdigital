import {env} from 'cloudflare:workers';
import {sendMorningSummaries} from './daily-notices';
import {sendClassReminders} from './class-reminders';
import {sendReliefReminders} from './relief-reminders';
import {sendTaskNotices,type TaskNotice} from './task-push';
import {retryableDelivery,type RetryTarget} from '../notification-retry-model';
import {malaysiaDay,reliefVisibleNow,matchReliefTeacherId,reliefTasksForTeacher,type ReliefPlan} from '../staff-work-model';
import {staffNameMappings} from './staff-name-mappings';
import {reliefReadyBody,TASKS_URL} from '../daily-notice-model';

export async function retryNotification(target:RetryTarget,now=new Date()){
 const row=await env.DB.prepare('SELECT d.status,d.updated_at AS updatedAt,s.id AS deviceId FROM staff_task_push_deliveries d LEFT JOIN push_subscriptions s ON s.id=d.subscription_id AND s.user_id=d.user_id JOIN portal_users u ON u.id=d.user_id AND u.status=\'active\' AND u.deleted_at IS NULL WHERE d.task_id=? AND d.subscription_id=? AND d.user_id=?').bind(target.taskId,target.subscriptionId,target.userId).first<{status:string;updatedAt:string;deviceId:string|null}>();
 if(!row)return {status:'skipped',message:'Rekod penghantaran atau pengguna tidak ditemui.'};
 if(!retryableDelivery(row.status,row.updatedAt,now.getTime()))return {status:'skipped',message:row.status==='sent'?'Notifikasi ini sudah berjaya dihantar. Tiada penghantaran berulang.':'Penghantaran masih dalam proses. Cuba semula selepas dua minit.'};
 if(!row.deviceId)return {status:'skipped',message:'Peranti ini tidak lagi berdaftar. Pengguna perlu aktifkan semula notifikasi pada peranti tersebut.'};
 const budget={remaining:1},today=malaysiaDay(now);
 if(target.taskId.startsWith('morning-summary:'))await sendMorningSummaries(now,budget,true,target);
 else if(target.taskId.startsWith('class:'))await sendClassReminders(now,budget,target);
 else if(target.taskId.startsWith('reminder:'))await sendReliefReminders(now,budget,target);
 else {
  let notice:TaskNotice|undefined;
  if(target.taskId.startsWith('assignment:')){
   const task=await env.DB.prepare("SELECT a.role,a.start_date AS startDate,a.end_date AS endDate,d.kind FROM staff_work_assignments a JOIN staff_work_documents d ON d.id=a.document_id WHERE a.id=? AND a.user_id=? AND d.published=1 AND (a.end_date='' OR a.end_date>=?)").bind(target.taskId.slice('assignment:'.length),target.userId,today).first<{role:string;startDate:string;endDate:string;kind:string}>();
   if(task)notice={...target,title:task.kind==='duty'?'Tugasan guru bertugas baharu':'Tugasan baharu',body:`${task.role}${task.startDate?` · ${task.startDate}${task.endDate&&task.endDate!==task.startDate?` hingga ${task.endDate}`:''}`:''}`.slice(0,500),url:TASKS_URL};
  }else if(reliefVisibleNow(now)){
   const plan=await env.DB.prepare('SELECT id,date,file_name AS fileName,assignments_json AS assignmentsJson FROM relief_plans WHERE date=? ORDER BY rowid DESC LIMIT 1').bind(today).first<{id:string;date:string;fileName:string;assignmentsJson:string}>();
   if(plan&&target.taskId===`relief-ready:${today}`)notice={...target,title:'Jadual relief telah disediakan',body:reliefReadyBody(today),url:TASKS_URL,ttl:3600};
   else if(plan&&target.taskId.startsWith(`relief-publish:${plan.id}:`)){
    const users=(await env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL").all<{id:string;name:string}>()).results,actor=users.find(u=>u.id===target.userId);
    const current:ReliefPlan={...plan,assignments:JSON.parse(plan.assignmentsJson)},mappings=await staffNameMappings();
    const teacher=actor?matchReliefTeacherId(current.assignments,actor,users,mappings):null;
    const tasks=teacher?await reliefTasksForTeacher([current],teacher,today,now):[];
    const task=tasks.find(t=>target.taskId===`relief-publish:${plan.id}:${t.id}`);
    if(task)notice={...target,title:'Relief hari ini',body:`${task.context} · ${task.detail}`.slice(0,500),url:TASKS_URL};
   }
  }
  if(notice)await sendTaskNotices([notice],budget);
 }
 if(budget.remaining===1)return {status:'skipped',message:'Tiada penghantaran dibuat: tugasan telah berubah, tamat, dibatalkan, tetapan dimatikan atau telah dihantar oleh proses lain. Segarkan rekod.'};
 const result=await env.DB.prepare('SELECT status FROM staff_task_push_deliveries WHERE task_id=? AND subscription_id=? AND user_id=?').bind(target.taskId,target.subscriptionId,target.userId).first<{status:string}>();
 return {status:result?.status||'failed',message:result?.status==='sent'?'Berjaya dihantar semula kepada pelayan push untuk peranti penerima ini.':'Percubaan semula masih gagal. Semak ralat penghantaran pada rekod ini.'};
}
