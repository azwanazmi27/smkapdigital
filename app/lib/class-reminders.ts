import {reminderNameCache} from '../reminder-name-cache';
import {env} from 'cloudflare:workers';
import {malaysiaDay,teachingDay,personalAbsenceTasks,type PersonalAbsence} from '../staff-work-model';
import {applyMainstreamTimes} from '../mainstream-times';
import {form6Lessons,type Form6Data} from '../form6-model';
import {staffNameMappings} from './staff-name-mappings';
import {sendTaskNotices,type TaskNotice,type PushBudget} from './task-push';
import {dueClasses} from '../class-reminder-model';
export async function sendClassReminders(now=new Date(),budget?:PushBudget){
 const [directory,schedule,timing,form6,absences]=await Promise.all([
 env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL").all<{id:string;name:string}>(),
 env.DB.prepare("SELECT teachers_json FROM relief_schedules WHERE is_active='1' ORDER BY created_at DESC,rowid DESC LIMIT 1").first<{teachers_json:string}>(),
 env.DB.prepare("SELECT data_json FROM mainstream_times WHERE id='active'").first<{data_json:string}>(),
 env.DB.prepare("SELECT data_json FROM form6_timetable WHERE id='active'").first<{data_json:string}>(),
 env.DB.prepare("SELECT id,teacher_name AS teacherName,absence_date AS absenceDate,end_date AS endDate,reason,duration,start_time AS startTime,end_time AS endTime FROM absences WHERE absence_date<=? AND COALESCE(NULLIF(end_date,''),absence_date)>=?").bind(malaysiaDay(now),malaysiaDay(now)).all<PersonalAbsence>()]);
 const mappings=await staffNameMappings(),teachers=schedule?JSON.parse(schedule.teachers_json):null,times=timing?JSON.parse(timing.data_json):null,f6:Form6Data|null=form6?JSON.parse(form6.data_json):null;
 const cachedMappings=reminderNameCache([...(Array.isArray(teachers)?teachers.map(t=>t.name).filter((n:unknown)=>typeof n==='string'):[]),...absences.results.map(a=>a.teacherName)],directory.results,mappings);
 const subscribed=await env.DB.prepare('SELECT DISTINCT user_id FROM push_subscriptions').all<{user_id:string}>();const ids=new Set(subscribed.results.map(s=>s.user_id));const notices:TaskNotice[]=[];
 for(const actor of directory.results.filter(u=>ids.has(u.id))){
 let day=teachingDay(teachers,actor,directory.results,now,cachedMappings);if(times)day=applyMainstreamTimes(day,times);
 const lessons=f6?form6Lessons(f6,actor.id,day.day):null;if(lessons)day={...day,state:'ready',lessons};
 const personal=personalAbsenceTasks(absences.results,actor,directory.results,cachedMappings,now);
 for(const lesson of dueClasses(day,now)){
 const absent=personal.some(a=>{if(a.startDate>day.date||a.endDate<day.date)return false;const row=absences.results.find(r=>`absence:${r.id}`===a.id);return !row||row.duration!=='partial'||!row.startTime||!row.endTime||(row.startTime<lesson.endTime!&&row.endTime>lesson.startTime!);});if(absent)continue;
 notices.push({userId:actor.id,taskId:`class:${day.date}:${actor.id}:${lesson.startTime}:${lesson.className}:${lesson.subject}`,title:`Kelas bermula dalam ${Math.max(1,Math.ceil((Date.parse(`${day.date}T${lesson.startTime}:00+08:00`)-now.getTime())/60000))} minit`,body:`${lesson.subject} · ${lesson.className} · ${lesson.startTime}–${lesson.endTime}`,url:'/?module=warga&tasks=1',ttl:600});
 }}
 await sendTaskNotices(notices,budget);
}
