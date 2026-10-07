import {malaysiaClock} from './malaysia-clock';
export const TASKS_URL='/?module=warga&tasks=1';
export function morningDue(now:Date,time="07:25"){const p=malaysiaClock(now),minute=p.hour*60+p.minute,start=Number(time.slice(0,2))*60+Number(time.slice(3));return p.weekday!==0&&p.weekday!==6&&minute>=start&&minute<start+20;}
export function reliefReadyBody(date:string){const d=new Date(`${date}T12:00:00+08:00`),day=new Intl.DateTimeFormat('ms-MY',{weekday:'long',timeZone:'Asia/Kuala_Lumpur'}).format(d);return `Jadual relief untuk hari ini ${day}, ${date.slice(8,10)}${date.slice(5,7)}${date.slice(0,4)} telah disediakan. Cikgu boleh melihat relief cikgu di TUGASAN SAYA.`;}
export function morningBody(name:string,teaching:number|null,relief:number|null,duty:number,other:number){return `Selamat pagi Cikgu ${name}, berikut merupakan tugasan yang ditugaskan kepada cikgu pada hari ini.\n\nWaktu Mengajar : ${teaching===null?'Jadual belum tersedia':`${teaching} waktu`}\nRelief : ${relief===null?'Belum disediakan':`${relief} relief`}\nGuru Bertugas : ${duty?'Ya':'Tiada'}\nTugasan Lain : ${other} tugasan\n\nSelamat berkhidmat untuk mendidik cikgu, Terima Kasih Cikgu ${name}.`;}
export function absenceMorningBody(name:string,reasons:string[]){
 const unique=[...new Set(reasons.map(r=>r.trim()).filter(Boolean))];
 return `Selamat pagi Cikgu ${name} 🌤️\n\n`+unique.map(reason=>`Cikgu dilaporkan tidak hadir hari ini kerana ${reason}.\n\n${/\bMC\b|cuti sakit|sijil sakit/i.test(reason)?'Semoga cikgu cepat sembuh dan kembali sihat.':'Semoga urusan cikgu dipermudahkan.'}`).join('\n');
}
