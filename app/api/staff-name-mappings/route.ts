import {env} from 'cloudflare:workers';
import {portalActor} from '../../server-auth';
import {documentNameKey,matchDocumentUserId} from '../../staff-work-model';
import {staffNameMappings} from '../../lib/staff-name-mappings';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function admin(request:Request){const actor=await portalActor(request);return actor&&['admin','super_admin'].includes(actor.role)?actor:null;}
export async function GET(request:Request){
 if(!await admin(request))return reply({error:'Akses pentadbir diperlukan.'},403);
 try{
 const users=(await env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL ORDER BY name").all<{id:string;name:string}>()).results;
 const mappings=await staffNameMappings(),names=new Set<string>();
 const schedule=await env.DB.prepare("SELECT teachers_json FROM relief_schedules WHERE is_active='1' ORDER BY created_at DESC,rowid DESC LIMIT 1").first<{teachers_json:string}>();
 if(schedule)for(const teacher of JSON.parse(schedule.teachers_json))if(typeof teacher.name==='string')names.add(teacher.name);
 const plans=await env.DB.prepare('SELECT assignments_json FROM relief_plans ORDER BY rowid DESC LIMIT 30').all<{assignments_json:string}>();
 for(const plan of plans.results){try{for(const row of JSON.parse(plan.assignments_json))if(typeof row.reliefTeacher==='string'&&row.reliefTeacher)names.add(row.reliefTeacher);}catch{}}
 const saved=await env.DB.prepare('SELECT source_name FROM staff_name_mappings').all<{source_name:string}>();for(const row of saved.results)names.add(row.source_name);
 const rows=[...new Map([...names].map(name=>{const key=documentNameKey(name);return [key,{key,name,userId:mappings[key]||matchDocumentUserId(name,users),manual:!!mappings[key]}];})).values()].sort((a,b)=>Number(!!a.userId)-Number(!!b.userId)||a.name.localeCompare(b.name));
 return reply({users,rows});
 }catch{return reply({error:'Senarai padanan tidak dapat dimuatkan.'},503);}
}
export async function POST(request:Request){
 const actor=await admin(request);if(!actor)return reply({error:'Akses pentadbir diperlukan.'},403);
 try{
 const body=await request.json() as {name?:string;userId?:string};
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>200||typeof body.userId!=='string')return reply({error:'Pilih nama dan akaun guru yang sah.'},400);
 const key=documentNameKey(body.name);if(!key)return reply({error:'Nama tidak sah.'},400);
 if(!body.userId){await env.DB.prepare('DELETE FROM staff_name_mappings WHERE name_key=?').bind(key).run();return reply({ok:true});}
 const user=await env.DB.prepare("SELECT id FROM portal_users WHERE id=? AND status='active' AND deleted_at IS NULL").bind(body.userId).first();if(!user)return reply({error:'Akaun guru tidak aktif.'},400);
 await env.DB.prepare('INSERT INTO staff_name_mappings(name_key,source_name,user_id,updated_by,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(name_key) DO UPDATE SET source_name=excluded.source_name,user_id=excluded.user_id,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(key,body.name.trim(),body.userId,actor.id,new Date().toISOString()).run();
 return reply({ok:true});
 }catch{return reply({error:'Padanan tidak dapat disimpan.'},503);}
}
