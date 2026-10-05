import type {NameMatch} from './name-matching';
export const schoolDays=['Isnin','Selasa','Rabu','Khamis','Jumaat'];
export type Form6Lesson={day:string;start:number;end:number;subject:string;className:string};
export type Form6Teacher=Partial<NameMatch>&{ignored?:boolean;name:string;userId:string;lessons:Form6Lesson[]};
export type Form6Time={day:string;period:number;startTime:string;endTime:string};
export type Form6Data={teachers:Form6Teacher[];times:Form6Time[]};
export function form6Errors(data:Form6Data){
 const errors:string[]=[]; const seen=new Set<string>();
 if(!data.times?.length)errors.push('Tambah waktu PdPC secara manual atau muat naik fail waktu.');
 for(const t of data.times||[]){const key=`${t.day}:${t.period}`;if(!schoolDays.includes(t.day)||!Number.isInteger(t.period)||t.period<1||t.period>30||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.startTime)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.endTime)||t.startTime>=t.endTime)errors.push(`Masa tidak sah: ${t.day} W${t.period}.`);if(seen.has(key))errors.push(`Waktu berulang: ${t.day} W${t.period}.`);seen.add(key);}
 for(const day of schoolDays){const times=(data.times||[]).filter(t=>t.day===day).sort((a,b)=>a.period-b.period);for(let i=1;i<times.length;i++)if(times[i].startTime<times[i-1].endTime)errors.push(`Masa bertindih: ${day} W${times[i].period}.`);}
 const users=new Set<string>();
 for(const teacher of data.teachers||[]){if(teacher.ignored)continue;if(!teacher.userId)errors.push(`Padankan nama: ${teacher.name}.`);else if(users.has(teacher.userId))errors.push(`Akaun berulang: ${teacher.name}.`);users.add(teacher.userId);const slots=new Set<string>();
 for(const l of teacher.lessons||[]){if(!schoolDays.includes(l.day)||!Number.isInteger(l.start)||!Number.isInteger(l.end)||l.start<1||l.end<l.start||l.end>30||!l.subject.trim()||!l.className.trim()){errors.push(`Semak kelas ${teacher.name}: ${l.day} W${l.start}.`);continue;}for(let p=l.start;p<=l.end;p++){const key=`${l.day}:${p}`;if(!seen.has(key))errors.push(`Masa belum diisi: ${teacher.name} · ${l.day} W${p}.`);if(slots.has(key))errors.push(`Kelas bertindih: ${teacher.name} · ${l.day} W${p}.`);slots.add(key);}}
 }
 return [...new Set(errors)];
}

// Treat extraction output as untrusted data; preserve uncertain cells for review.
export function normalizeForm6(value:unknown):Form6Data {
 const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'?v as Record<string,unknown>:{};
 const text=(v:unknown)=>typeof v==='string'?v.trim().slice(0,200):'';
 const raw=object(value);
 return {teachers:(Array.isArray(raw.teachers)?raw.teachers:[]).slice(0,200).map(v=>{const t=object(v);return {name:text(t.name),userId:text(t.userId),...(t.ignored===true?{ignored:true}:{}),lessons:(Array.isArray(t.lessons)?t.lessons:[]).slice(0,300).map(v=>{const l=object(v);return {day:text(l.day),start:Number(l.start)||0,end:Number(l.end)||0,subject:text(l.subject),className:text(l.className)};})};}),times:(Array.isArray(raw.times)?raw.times:[]).slice(0,150).map(v=>{const t=object(v);return {day:text(t.day),period:Number(t.period)||0,startTime:text(t.startTime),endTime:text(t.endTime)};})};
}
export function form6Lessons(data:Form6Data,userId:string,day:string){
 const teacher=data.teachers.find(t=>!t.ignored&&t.userId===userId);
 if(!teacher)return null;
 return teacher.lessons.filter(l=>l.day===day).sort((a,b)=>a.start-b.start).map(l=>({...l,startTime:data.times.find(t=>t.day===day&&t.period===l.start)?.startTime,endTime:data.times.find(t=>t.day===day&&t.period===l.end)?.endTime}));
}

/** Merge imports by account; retain teachers absent from the new document. */
export function mergeForm6Teachers(existing:Form6Teacher[],incoming:Form6Teacher[]):Form6Teacher[]{
 const merged=existing.map(t=>({...t}));
 const key=(name:string)=>name.toLocaleLowerCase('ms-MY').replace(/[^\p{L}\p{N}]/gu,'');
 for(const teacher of incoming){
  const index=merged.findIndex(t=>teacher.userId&&t.userId?teacher.userId===t.userId:!!key(teacher.name)&&key(t.name)===key(teacher.name));
  if(index<0)merged.push(teacher);
  else merged[index]={...teacher,userId:teacher.userId||merged[index].userId};
 }
 return merged;
}
