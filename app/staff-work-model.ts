export type WorkAssignment={userId:string;name:string;role:string;startDate:string;endDate:string};
export const normalName=(s:string)=>s.toUpperCase().replace(/\b(CIKGU|ENCIK|PUAN|USTAZAH|USTAZ|DR)\b/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export function validDate(s:string){return typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function currentWeek(now=new Date()){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);return {start,end:d.toISOString().slice(0,10)};}

export type WorkAction={module:'oprgenerator'|'oprduty'|'etempahan'|'epemantauan'|'uploads'|'skas';label:string;tab?:'daily'|'weekly'};
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
