import {malaysiaClock} from './malaysia-clock';
import type {TeachingDay} from './staff-work-model';
export function dueClasses(day:TeachingDay,now=new Date(),leadMinutes=10){
 const date=malaysiaClock(now).date;
 if(day.date!==date)return [];
 return day.lessons.filter(l=>{if(!l.startTime||!l.endTime)return false;const start=new Date(`${day.date}T${l.startTime}:00+08:00`).getTime();const elapsed=now.getTime()-(start-leadMinutes*60000);return elapsed>=0&&elapsed<180000;});
}
