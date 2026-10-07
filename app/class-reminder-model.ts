import type {TeachingDay} from './staff-work-model';
export function dueClasses(day:TeachingDay,now=new Date(),leadMinutes=10){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 if(day.date!==date)return [];
 return day.lessons.filter(l=>{if(!l.startTime||!l.endTime)return false;const start=new Date(`${day.date}T${l.startTime}:00+08:00`).getTime();const elapsed=now.getTime()-(start-leadMinutes*60000);return elapsed>=0&&elapsed<180000;});
}
