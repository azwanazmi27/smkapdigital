import { env } from 'cloudflare:workers';
import { syncTeacherReview } from '../../lib/teacher-review';
import { verifyReliefPin } from '../../lib/relief-pin';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
const authorized=(request:Request)=>verifyReliefPin(request.headers.get('x-admin-pin'));

export async function GET(request:Request) {
 if(!await authorized(request)) return json({error:'PIN pentadbir diperlukan.'},401);
 const [candidates,teachers]=await env.DB.batch([
  env.DB.prepare("SELECT name_key AS nameKey,name,source_label AS sourceLabel,status,teacher_id AS teacherId FROM relief_teacher_review WHERE schedule_id IN (SELECT id FROM relief_schedules WHERE is_active='1') ORDER BY status,name"),
  env.DB.prepare('SELECT id,name,category FROM teachers ORDER BY name'),
 ]);
 return json({candidates:candidates.results,teachers:teachers.results});
}

export async function POST(request:Request) {
 if(!await authorized(request)) return json({error:'PIN pentadbir diperlukan.'},401);
 const body=await request.json() as {action?:string;nameKey?:string;category?:string;teacherId?:string};
 if(body.action==='sync') {
  const schedule=await env.DB.prepare("SELECT id,source_label,teachers_json FROM relief_schedules WHERE is_active='1' ORDER BY created_at DESC LIMIT 1").first<{id:string;source_label:string;teachers_json:string}>();
  if(!schedule) return json({message:'Belum ada jadual waktu guru aSc dimuat naik. Muat naik PDF jadual waktu dahulu.'});
  await syncTeacherReview(env.DB,schedule.id,schedule.source_label,JSON.parse(schedule.teachers_json));
  return json({message:'Nama daripada jadual waktu guru aSc aktif telah disemak.'});
 }
 const candidate=await env.DB.prepare("SELECT * FROM relief_teacher_review WHERE name_key=? AND schedule_id IN (SELECT id FROM relief_schedules WHERE is_active='1')").bind(body.nameKey||'').first<{name_key:string;name:string;status:string;teacher_id:string}>();
 if(!candidate) return json({error:'Nama tiada dalam jadual aktif. Segarkan senarai.'},404);
 const now=new Date().toISOString();
 if(body.action==='reject'&&candidate.status==='pending') {
  await env.DB.prepare("UPDATE relief_teacher_review SET status='rejected',reviewed_at=? WHERE name_key=? AND status='pending'").bind(now,candidate.name_key).run();
  return json({message:'Nama diabaikan. Jadual relief dan rekod lama tidak dipadam.'});
 }
 if(body.action!=='approve'||!['mainstream','form6'].includes(body.category||'')) return json({error:'Pilih kumpulan guru sebelum mengesahkan.'},400);
 if(candidate.status==='approved') return json({message:'Nama ini sudah disahkan.'});
 const existing=body.teacherId?await env.DB.prepare('SELECT id FROM teachers WHERE id=?').bind(body.teacherId).first<{id:string}>():null;
 if(body.teacherId&&!existing) return json({error:'Guru sedia ada tidak ditemui.'},400);
 // Deterministic ID plus conditional statements keep repeated/concurrent approvals idempotent.
 const newId='relief-'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(candidate.name_key)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const id=existing?.id||newId;
 await env.DB.batch([
  existing
   ?env.DB.prepare("UPDATE teachers SET name=?,category=? WHERE id=? AND EXISTS (SELECT 1 FROM relief_teacher_review WHERE name_key=? AND status!='approved')").bind(candidate.name,body.category,id,candidate.name_key)
   :env.DB.prepare("INSERT OR IGNORE INTO teachers(id,name,category,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM relief_teacher_review WHERE name_key=? AND status!='approved')").bind(id,candidate.name,body.category,now,candidate.name_key),
  env.DB.prepare("UPDATE relief_teacher_review SET status='approved',teacher_id=?,reviewed_at=? WHERE name_key=? AND status!='approved'").bind(id,now,candidate.name_key),
 ]);
 return json({message:'Guru disahkan dan boleh dipilih dalam e-Keberadaan.'});
}
