import {notificationContext,type NotificationContext} from './notification-context';
import {retryLessons,selectRetryNotices,type RetryTarget} from '../notification-retry-model';
import {reminderNameCache} from '../reminder-name-cache';
import {teachingDay,personalAbsenceTasks} from '../staff-work-model';
import {applyMainstreamTimes} from '../mainstream-times';
import {form6Lessons,type Form6Data} from '../form6-model';
import {sendTaskNotices,type TaskNotice,type PushBudget} from './task-push';
import {dueClasses} from '../class-reminder-model';
export async function sendClassReminders(now=new Date(),budget?:PushBudget,target?:RetryTarget,context?:NotificationContext){
 const snapshot=context??await notificationContext(now),{settings,users:directory,schedule,timing,form6,absences,mappings,subscribed}=snapshot;
 if(!settings.classEnabled)return;
 const teachers=schedule?JSON.parse(schedule.teachers_json):null,times=timing?JSON.parse(timing.data_json):null,f6:Form6Data|null=form6?JSON.parse(form6.data_json):null;
 const cachedMappings=reminderNameCache([...(Array.isArray(teachers)?teachers.map(t=>t.name).filter((n:unknown)=>typeof n==='string'):[]),...absences.results.map(a=>a.teacherName)],directory.results,mappings);
 const ids=new Set(subscribed.results.map(s=>s.user_id));const notices:TaskNotice[]=[];
 for(const actor of directory.results.filter(u=>ids.has(u.id)&&(!target||u.id===target.userId))){
 let day=teachingDay(teachers,actor,directory.results,now,cachedMappings);if(times)day=applyMainstreamTimes(day,times);
 const lessons=f6?form6Lessons(f6,actor.id,day.day):null;if(lessons)day={...day,state:'ready',lessons};
 const personal=personalAbsenceTasks(absences.results,actor,directory.results,cachedMappings,now);
 for(const lesson of (target?retryLessons(day,now):dueClasses(day,now,settings.leadMinutes))){
 const absent=personal.some(a=>{if(a.startDate>day.date||a.endDate<day.date)return false;const row=absences.results.find(r=>`absence:${r.id}`===a.id);return !row||row.duration!=='partial'||!row.startTime||!row.endTime||(row.startTime<lesson.endTime!&&row.endTime>lesson.startTime!);});if(absent)continue;
 notices.push({userId:actor.id,taskId:`class:${day.date}:${actor.id}:${lesson.startTime}:${lesson.className}:${lesson.subject}`,title:`Kelas bermula dalam ${Math.max(1,Math.ceil((Date.parse(`${day.date}T${lesson.startTime}:00+08:00`)-now.getTime())/60000))} minit`,body:`${lesson.subject} · Kelas ${lesson.className.replace(/^Kelas\s+/i,'')}\n🕒 ${lesson.startTime}–${lesson.endTime}`,url:'/?module=warga&tasks=1',ttl:600});
 }}
 await sendTaskNotices(selectRetryNotices(notices,target),budget);
}
