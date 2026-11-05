import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync('app/api/staff-work/route.ts','utf8').replace(/^import .*;\n/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/export /g,'');
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE staff_work_documents(id TEXT PRIMARY KEY,owner_id TEXT,kind TEXT,published INTEGER,assignments_json TEXT);CREATE TABLE staff_work_assignments(id TEXT PRIMARY KEY,document_id TEXT,user_id TEXT,task_key TEXT UNIQUE,role TEXT,start_date TEXT,end_date TEXT,completed INTEGER);CREATE TABLE staff_task_state(user_id TEXT,task_id TEXT);CREATE TABLE portal_users(id TEXT PRIMARY KEY,name TEXT,status TEXT,deleted_at TEXT);CREATE TABLE admin_module_permissions(user_id TEXT,module_key TEXT,enabled INTEGER);`);
 const rows=[{userId:'a',name:'Guru A',role:'Guru Bertugas · Minggu 38',startDate:'2026-11-02',endDate:'2026-11-06'},{userId:'a',name:'Guru A',role:'Guru Bertugas · Minggu 39',startDate:'2026-11-09',endDate:'2026-11-13'}];
 db.prepare('INSERT INTO staff_work_documents VALUES(?,?,?,?,?)').run('doc','owner','duty',1,JSON.stringify(rows));
 for(const [i,r] of rows.entries())db.prepare('INSERT INTO staff_work_assignments VALUES(?,?,?,?,?,?,?,0)').run('row'+i,'doc',r.userId,'key'+i,r.role,r.startDate,r.endDate);
 db.exec("INSERT INTO portal_users VALUES('a','Guru A','active',NULL),('b','Guru B','active',NULL),('inactive','Guru Lama','inactive',NULL);INSERT INTO staff_task_state VALUES('a','assignment:row0'),('a','assignment:row1');");
 const prepare=sql=>({bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},sql,args};}});
 const env={DB:{prepare,async batch(statements){db.exec('BEGIN');try{for(const {sql,args} of statements)db.prepare(sql).run(...args);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}}};
 const post=async(action,userId='b',role='admin',dates={})=>{
 const api=new Function('env','portalActor','waitUntil','validDate','stableTaskKey','malaysiaDay','sendTaskNotices',compiled+';return {POST};')(env,async()=>({id:'owner',role}),()=>{},s=>/^\d{4}-\d{2}-\d{2}$/.test(s),async parts=>parts.join('|'),()=> '2026-11-05',async()=>{});
 return api.POST(new Request('https://portal.test/api/staff-work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:'doc',userId,startDate:'2026-11-02',endDate:'2026-11-06',...dates})}));};
 return {db,post,rows};
}
test('adding teacher inherits period and role, preserves other weeks and rejects duplicate',async()=>{const {db,post,rows}=setup();assert.equal((await post('add_duty_teacher')).status,200);const saved=JSON.parse(db.prepare('SELECT assignments_json FROM staff_work_documents').get().assignments_json);assert.deepEqual(saved.slice(0,2),rows);assert.deepEqual(saved[2],{...rows[0],userId:'b',name:'Guru B'});assert.equal((await post('add_duty_teacher')).status,409);assert.equal(db.prepare('SELECT count(*) n FROM staff_work_assignments').get().n,3);db.close();});
test('removing teacher only affects selected period and cleans its task state',async()=>{const {db,post,rows}=setup();assert.equal((await post('remove_duty_teacher','a')).status,200);assert.deepEqual(JSON.parse(db.prepare('SELECT assignments_json FROM staff_work_documents').get().assignments_json),[rows[1]]);assert.equal(db.prepare('SELECT id FROM staff_work_assignments').get().id,'row1');assert.equal(db.prepare('SELECT task_id FROM staff_task_state').get().task_id,'assignment:row1');db.close();});
test('unauthorized owners, invalid teachers and nonexistent periods cannot mutate roster',async()=>{const {db,post}=setup();assert.equal((await post('add_duty_teacher','b','staff')).status,403);assert.equal((await post('add_duty_teacher','inactive')).status,400);assert.equal((await post('add_duty_teacher','b','admin',{startDate:'2026-12-01',endDate:'2026-12-04'})).status,409);assert.equal(db.prepare('SELECT count(*) n FROM staff_work_assignments').get().n,2);db.close();});
