import {notificationContext,type NotificationContext} from './notification-context';
import {retryLessons,selectRetryNotices,type RetryTarget} from '../notification-retry-model';
import {malaysiaDay,matchReliefTeacherId,reliefVisibleNow,type ReliefPlan} from '../staff-work-model';
import {timedReliefTasks} from '../relief-times';
import {dueClasses} from '../class-reminder-model';
import {sendTaskNotices,type TaskNotice,type PushBudget} from './task-push';
export async function sendReliefReminders(now=new Date(),budget?:PushBudget,target?:RetryTarget,context?:NotificationContext){
 if(!reliefVisibleNow(now))return;
 const {settings,plan:row,timing,users:directory,mappings,subscribed}=context??await notificationContext(now);
 if(!settings.reliefEnabled||!row||!timing)return;
 const today=malaysiaDay(now),assignments=JSON.parse(row.assignmentsJson);if(!Array.isArray(assignments))return;
 const config=JSON.parse(timing.data_json),plan:ReliefPlan={...row,assignments};
 const users=directory.results,ids=new Set(subscribed.results.map(s=>s.user_id)),notices:TaskNotice[]=[];
 for(const actor of users.filter(u=>ids.has(u.id)&&(!target||u.id===target.userId))){const teacherId=matchReliefTeacherId(assignments,actor,users,mappings);if(!teacherId)continue;
  for(const {task,sessions,absentTeacher} of await timedReliefTasks(plan,teacherId,config,now)){
   for(const session of (target?retryLessons({date:today,day:'',state:'ready',lessons:sessions},now):dueClasses({date:today,day:'',state:'ready',lessons:sessions},now,settings.leadMinutes))){
    notices.push({userId:actor.id,taskId:`reminder:${task.id}:${actor.id}:${session.startTime}`,title:`Relief bermula dalam ${Math.max(1,Math.ceil((Date.parse(`${today}T${session.startTime}:00+08:00`)-now.getTime())/60000))} minit`,body:`${session.subject} · Kelas ${session.className.replace(/^Kelas\s+/i,'')}\n🕒 ${session.startTime}–${session.endTime}${absentTeacher?`\nGanti: Cikgu ${absentTeacher.replace(/^Cikgu\s+/i,'')}`:''}`,url:'/?module=warga&tasks=1',ttl:600});
   }
  }
 }
 await sendTaskNotices(selectRetryNotices(notices,target),budget);
}
