import {malaysiaClock} from './malaysia-clock';
import {reliefTasksForTeacher,type ReliefPlan,type TeachingDay} from './staff-work-model';
import {applyMainstreamTimes,type MainstreamTimes} from './mainstream-times';
export async function timedReliefTasks(plan:ReliefPlan,teacherId:string,config:MainstreamTimes|null,now=new Date()){
 const tasks=await reliefTasksForTeacher([plan],teacherId,plan.date,now);
 const entries=plan.assignments.filter(a=>a&&!a.cancelled&&a.reliefId===teacherId);
 const day=malaysiaClock(now).day;
 return tasks.map((task,index)=>{
  const item=entries[index];const periods=[...new Set((item.periods||[]).map(Number).filter(p=>Number.isInteger(p)&&p>0&&p<=30))].sort((a,b)=>a-b);
  const groups:number[][]=[];for(const p of periods){const last=groups.at(-1);if(last&&last.at(-1)===p-1)last.push(p);else groups.push([p]);}
  const base:TeachingDay={date:plan.date,day,state:'ready',lessons:groups.map(g=>({start:g[0],end:g.at(-1)!,subject:item.lesson?.subject||'',className:item.lesson?.className||''}))};
  const sessions=config?applyMainstreamTimes(base,config).lessons:base.lessons;
  const ranges=sessions.filter(s=>s.startTime&&s.endTime).map(s=>`${s.startTime}–${s.endTime}`);
  return {task:{...task,detail:[task.detail,ranges.length?`Masa ${ranges.join(', ')}`:'Masa belum ditetapkan'].join(' · ')},sessions,absentTeacher:item.absentTeacher||''};
 });
}
