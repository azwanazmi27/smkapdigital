import type {TeachingDay} from './staff-work-model';
export type MainstreamTime={day:string;period:number;startTime:string;endTime:string};
export type MainstreamTimes={times:MainstreamTime[];lowerBreak:number;upperBreak:number};
export function timingErrors(data:MainstreamTimes){
 const errors:string[]=[];const seen=new Set<string>();
 if(!Array.isArray(data.times)||!data.times.length)return ['Isi waktu PdPC.'];
 for(const t of data.times){const key=`${t.day}:${t.period}`;if(!['Isnin','Selasa','Rabu','Khamis','Jumaat'].includes(t.day)||!Number.isInteger(t.period)||t.period<1||t.period>30||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.startTime)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.endTime)||t.startTime>=t.endTime||seen.has(key))errors.push(`Semak ${key}.`);seen.add(key);}
 for(const day of ['Isnin','Selasa','Rabu','Khamis','Jumaat']){const rows=data.times.filter(t=>t.day===day).sort((a,b)=>a.period-b.period);for(let i=1;i<rows.length;i++)if(rows[i].startTime<rows[i-1].endTime)errors.push(`Masa bertindih: ${day}.`);}
 for(const p of [data.lowerBreak,data.upperBreak])if(!Number.isInteger(p)||p<1||p>30)errors.push('Waktu rehat tidak sah.');
 return errors;
}
export function applyMainstreamTimes(timetable:TeachingDay,config:MainstreamTimes):TeachingDay{
 return {...timetable,lessons:timetable.lessons.flatMap(lesson=>{
  const forms=[...lesson.className.matchAll(/(?:^|[\s/,])([1-5])(?=\s|[A-Za-z]|$)/g)].map(m=>Number(m[1]));
  if(!forms.length)return [{...lesson,startTime:undefined,endTime:undefined}];
  const breaks=new Set(forms.map(f=>f<=3?config.lowerBreak:config.upperBreak));
  // Split around a recess; never turn a recess into a teaching reminder.
  const groups:number[][]=[];
  for(let p=lesson.start;p<=lesson.end;p++){if(breaks.has(p))continue;const last=groups.at(-1);if(last&&last.at(-1)===p-1)last.push(p);else groups.push([p]);}
  return groups.map(periods=>{const start=periods[0],end=periods.at(-1)!;const rows=periods.map(p=>config.times.find(t=>t.day===timetable.day&&t.period===p));const valid=rows.every(Boolean);return {...lesson,start,end,startTime:valid?rows[0]!.startTime:undefined,endTime:valid?rows.at(-1)!.endTime:undefined};});
 })};
}
