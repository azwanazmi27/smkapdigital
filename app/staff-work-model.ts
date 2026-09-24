export type WorkAssignment={userId:string;name:string;role:string;startDate:string;endDate:string};
export const normalName=(s:string)=>s.toUpperCase().replace(/\b(CIKGU|ENCIK|PUAN|USTAZAH|USTAZ|DR)\b/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export const reliefNameKey=(s:string)=>normalName(s)
 .replace(/\bTG\b/g,'TENGKU')
 .replace(/\bNORFATIMAWATI\b/g,'NOR FATIMAWATI')
 .replace(/\bIZZUDDIN\b/g,'IZZUDIN')
 .replace(/\b(?:BT|BTE)\b/g,'BINTI')
 .replace(/\bB\b/g,'BIN')
 .replace(/\b(?:MUHAMMAD|MOHAMAD|MOHAMMAD|MOHAMMED)\b/g,'MOHD')
 .replace(/\b(?:BIN|BINTI)\b/g,'')
 .replace(/\s+/g,' ')
 .trim();
export function sameReliefIdentity(a:string,b:string){const left=reliefNameKey(a),right=reliefNameKey(b),shorter=left.length<=right.length?left:right,longer=left.length<=right.length?right:left;return left===right||(shorter.split(' ').length>=3&&longer.startsWith(shorter+' '));}
export function validDate(s:string){return typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function currentWeek(now=new Date()){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);return {start,end:d.toISOString().slice(0,10)};}

export type WorkAction={module:'oprgenerator'|'oprduty'|'etempahan'|'epemantauan'|'ekeberadaan'|'uploads'|'skas';label:string;tab?:'daily'|'weekly'};
export type StaffTaskType='relief'|'duty'|'program';
export type StaffTask={id:string;type:StaffTaskType;title:string;context:string;detail:string;source:string;startDate:string;endDate:string;status:string;documentId?:string;unseen:boolean;actions:WorkAction[]};
export type ReliefAssignment={absentId?:string;absentTeacher?:string;reliefId?:string;reliefTeacher?:string;cancelled?:boolean;periods?:Array<number|string>;lesson?:{className?:string;subject?:string}};
export type ReliefPlan={date:string;fileName:string;assignments:ReliefAssignment[]};
type NamedPerson={id:string;name:string};
function reliefNameScore(a:string,b:string){
 const left=reliefNameKey(a).split(' ').filter(Boolean),right=reliefNameKey(b).split(' ').filter(Boolean);
 if(!left.length||!right.length)return 0;
 if(left.join(' ')===right.join(' '))return 1000;
 const shorter=left.length<=right.length?left:right,longer=left.length<=right.length?right:left;
 if(shorter.length<2)return 0;
 for(let start=0;start<=longer.length-shorter.length;start++)if(shorter.every((word,index)=>word===longer[start+index]))return 100+shorter.length*10+shorter.length/longer.length;
 let cursor=0;for(const word of longer)if(word===shorter[cursor])cursor++;
 if(cursor===shorter.length&&shorter.length>=3&&shorter.length/longer.length>=0.75)return 50+shorter.length*10+shorter.length/longer.length;
 const shared=shorter.filter(word=>longer.includes(word)).length,dice=2*shared/(shorter.length+longer.length);
 if(left[0]===right[0]&&shared>=3&&dice>=0.7)return 20+shared*10+dice;
 return 0;
}
export function matchReliefTeacherId(assignments:ReliefAssignment[],actor:NamedPerson,users:NamedPerson[]){
 const teachers=[...new Map(assignments.filter(item=>!item.cancelled&&item.reliefId&&item.reliefTeacher).map(item=>[item.reliefId!,{id:item.reliefId!,name:item.reliefTeacher!}])).values()];
 const ranked=teachers.map(teacher=>({...teacher,score:reliefNameScore(actor.name,teacher.name)})).filter(teacher=>teacher.score>0).sort((a,b)=>b.score-a.score);
 if(!ranked.length||(ranked[1]&&ranked[1].score===ranked[0].score))return '';
 const candidate=ranked[0],owners=users.map(user=>({...user,score:reliefNameScore(user.name,candidate.name)})).filter(user=>user.score>0).sort((a,b)=>b.score-a.score);
 return owners[0]?.id===actor.id&&(!owners[1]||owners[1].score<owners[0].score)?candidate.id:'';
}
export function reliefVisibleNow(now=new Date()){
 const hourMinute=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 return hourMinute<'18:30';
}
export async function reliefTasksForTeacher(plans:ReliefPlan[],teacherId:string,today:string,now=new Date()):Promise<StaffTask[]>{
 if(!teacherId||today!==malaysiaDay(now)||!reliefVisibleNow(now))return [];
 const tasks:StaffTask[]=[];
 for(const plan of plans){
  if(plan.date!==today||!Array.isArray(plan.assignments))continue;
  for(const item of plan.assignments){
   if(!item||item.cancelled||item.reliefId!==teacherId)continue;
   const periods=(Array.isArray(item.periods)?item.periods:[]).map(String).filter(Boolean);
   const className=typeof item.lesson?.className==='string'?item.lesson.className.trim().slice(0,80):'';
   const subject=typeof item.lesson?.subject==='string'?item.lesson.subject.trim().slice(0,80):'';
   const absentTeacher=typeof item.absentTeacher==='string'?item.absentTeacher.trim().slice(0,120):'';
   const hash=await stableTaskKey(['relief',plan.date,teacherId,item.absentId||'',periods.join(','),className,subject]);
   tasks.push({id:`relief:${hash}`,type:'relief',title:'Relief',context:className?`Kelas ${className}`:'Kelas relief',detail:[periods.length?`Waktu ${periods.join(', ')}`:'Waktu belum dinyatakan',subject?`Subjek ${subject}`:'',absentTeacher?`Ganti ${absentTeacher}`:''].filter(Boolean).join(' · '),source:plan.fileName||'Jadual E-Relief',startDate:plan.date,endDate:plan.date,status:'Hari Ini',unseen:true,actions:[{module:'ekeberadaan',label:'Buka maklumat relief'}]});
  }
 }
 return tasks;
}
export const malaysiaDay=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function taskPriority(task:Pick<StaffTask,'type'|'status'|'startDate'>){if(task.type==='relief')return 0;if(task.type==='duty')return 1;if(task.type==='program'&&task.status==='Hari Ini')return 2;return 3;}
export function sortStaffTasks(tasks:StaffTask[]){return [...tasks].sort((a,b)=>taskPriority(a)-taskPriority(b)||a.startDate.localeCompare(b.startDate)||a.title.localeCompare(b.title,'ms-MY'));}
export async function stableTaskKey(parts:string[]){const bytes=new TextEncoder().encode(parts.map(value=>normalName(value||'')).join('|')),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');}
// Match the assigned role, never the programme title shared by all committee members.
export function workActions(task:{kind:string;role:string}):WorkAction[]{
 const role=task.role.toLocaleLowerCase('ms-MY'),actions:WorkAction[]=[];
 if(task.kind==='duty'||/\bguru bertugas\b|laporan (harian|mingguan).*bertugas/.test(role))actions.push({module:'oprduty',label:/\bmingguan\b/.test(role)?'Buat laporan mingguan':'Buat laporan guru bertugas',tab:/\bmingguan\b/.test(role)?'weekly':'daily'});
 if(/\bopr\b|one[ -]page report|laporan satu (muka surat|halaman)|(?:sediakan|menyediakan|buat|hasilkan|menulis|penyediaan) laporan (program|aktiviti)/.test(role))actions.push({module:'oprgenerator',label:'Buat OPR'});
 if(/\be[ -]?tempahan\b|(?:tempah|tempahan|menempah) (bilik|dewan|makmal|kemudahan)/.test(role))actions.push({module:'etempahan',label:'Buat tempahan'});
 if(/\be[ -]?pemantauan\b/.test(role))actions.push({module:'epemantauan',label:'Buka e-Pemantauan'});
 if(/\bmuat naik\b.*(?:kertas kerja|jadual guru bertugas)/.test(role))actions.push({module:'uploads',label:'Muat naik dokumen'});
 if(/\bsk@s\b|\bskas\b/.test(role))actions.push({module:'skas',label:'Buka Pusat SK@S'});
 return actions;
}
