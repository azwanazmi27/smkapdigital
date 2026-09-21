export type WorkAssignment={userId:string;name:string;role:string;startDate:string;endDate:string};
export const normalName=(s:string)=>s.toUpperCase().replace(/\b(CIKGU|ENCIK|PUAN|USTAZAH|USTAZ|DR)\b/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export const reliefNameKey=(s:string)=>normalName(s)
 .replace(/\bTG\b/g,'TENGKU')
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
