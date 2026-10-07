import type {TaskNotice} from './lib/task-push';
import type {TeachingDay} from './staff-work-model';
export type RetryTarget={userId:string;taskId:string;subscriptionId:string};
export function retryLessons(day:TeachingDay,now:Date){
 return day.lessons.filter(l=>Boolean(l.startTime&&l.endTime)&&Date.parse(`${day.date}T${l.startTime}:00+08:00`)>now.getTime());
}
export function selectRetryNotices(notices:TaskNotice[],target?:RetryTarget){
 return target?notices.filter(n=>n.userId===target.userId&&n.taskId===target.taskId).map(n=>({...n,subscriptionId:target.subscriptionId})):notices;
}
export function retryableDelivery(status:string,updatedAt:string,now=Date.now()){
 return status==='failed'||(status==='sending'&&Date.parse(updatedAt)<now-120000);
}
