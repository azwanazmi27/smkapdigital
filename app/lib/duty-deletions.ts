import {env} from 'cloudflare:workers';
export async function prepareDutyDeletions(){
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS opr_duty_deletions (report_date TEXT NOT NULL,week_number INTEGER NOT NULL,deleted_at TEXT NOT NULL,PRIMARY KEY(report_date,week_number))").run();
}
export function deletedDutyIdentity(name:string){
 const match=name.match(/^(\d{4}-\d{2}-\d{2})-Minggu-(\d{1,2})-Laporan-Harian-Guru-Bertugas-/i);
 return match?{date:match[1],week:Number(match[2])}:null;
}
