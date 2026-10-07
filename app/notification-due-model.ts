import {malaysiaClock} from './malaysia-clock';
import {morningDue} from './daily-notice-model';
import type {NotificationSettings} from './notification-settings-model';
type TimeSlot={day:string;startTime:string};
export function notificationJobsDue(now:Date,settings:NotificationSettings,mainstream:TimeSlot[],form6:TimeSlot[]){
 const clock=malaysiaClock(now),minute=clock.hour*60+clock.minute;
 const due=(times:TimeSlot[])=>times.some(t=>{
  if(t.day!==clock.day||!/^\d{2}:\d{2}$/.test(t.startTime))return false;
  const start=Number(t.startTime.slice(0,2))*60+Number(t.startTime.slice(3));
  const elapsed=minute-(start-settings.leadMinutes);
  return elapsed>=0&&elapsed<3;
 });
 const mainDue=due(mainstream);
 return {class:settings.classEnabled&&(mainDue||due(form6)),relief:settings.reliefEnabled&&mainDue&&clock.time<'18:30',morning:settings.morningEnabled&&morningDue(now,settings.morningTime)};
}
