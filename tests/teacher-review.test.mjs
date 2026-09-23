import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const compile=source=>ts.transpileModule(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {syncTeacherReview,teacherNameKey,reviewNames}=new Function(compile(read('app/lib/teacher-review.ts'))+';return {syncTeacherReview,teacherNameKey,reviewNames};')();
const createRoutes=new Function('env','syncTeacherReview','verifyReliefPin',compile(read('app/api/teacher-review/route.ts'))+';return {GET,POST};');
function fixture(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`CREATE TABLE teachers(id TEXT PRIMARY KEY,name TEXT,category TEXT,created_at TEXT);
 CREATE TABLE relief_schedules(id TEXT PRIMARY KEY,source_label TEXT,teachers_json TEXT,is_active TEXT,created_at TEXT);
 CREATE TABLE absences(id TEXT PRIMARY KEY,teacher_id TEXT,teacher_name TEXT,category TEXT,absence_date TEXT,end_date TEXT,reason TEXT,duration TEXT,start_time TEXT,end_time TEXT,note TEXT,relief_status TEXT,created_at TEXT,updated_at TEXT);`);
 sql.exec(read('drizzle/0008_striped_punisher.sql'));
 const db={prepare(query){let args=[];const stmt=sql.prepare(query);return {bind(...a){args=a;return this;},async all(){return {results:stmt.all(...args)};},async first(){return stmt.get(...args)||null;},async run(){return stmt.run(...args);}};},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 const routes=createRoutes({DB:db},syncTeacherReview,async pin=>pin==='test-pin');
 const request=(body,pin='test-pin')=>new Request('https://example.test/api/teacher-review',{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-admin-pin':pin},...(body?{body:JSON.stringify(body)}:{})});
 const post=async body=>{const res=await routes.POST(request(body));return {status:res.status,...await res.json()};};
 const schedule=async(id,names)=>{sql.prepare("UPDATE relief_schedules SET is_active='0'").run();sql.prepare('INSERT INTO relief_schedules VALUES(?,?,?,?,?)').run(id,id+'.pdf',JSON.stringify(names.map(name=>({name}))), '1',id);await syncTeacherReview(db,id,id+'.pdf',names.map(name=>({name})));};
 return {sql,db,routes,request,post,schedule};
}
test('normalization is conservative, deduplicates whitespace/case, never guesses abbreviations',()=>{
 assert.equal(teacherNameKey('  Azwan   bin Azmi '),'AZWAN BIN AZMI');
 assert.equal(reviewNames([{name:'Azwan'},{name:'AZWAN'},{}]).length,1);
 assert.notEqual(teacherNameKey('AINUL BT ALI'),teacherNameKey('AINUL BINTI ALI'));
});
test('new upload queues unknown names, preserves established groups and is repeatable',async()=>{
 const f=fixture();f.sql.prepare('INSERT INTO teachers VALUES(?,?,?,?)').run('old','AZWAN','form6','old');
 await f.schedule('a',['Azwan','NAMA BARU','NAMA BARU']);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM teachers').get().n,1);
 assert.equal(f.sql.prepare('SELECT status FROM relief_teacher_review WHERE name_key=?').get('NAMA BARU').status,'pending');
 await f.schedule('b',['AZWAN','NAMA BARU']);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM relief_teacher_review').get().n,2);
 assert.equal(f.sql.prepare('SELECT category FROM teachers WHERE id=?').get('old').category,'form6');
 assert.equal((await f.post({action:'approve',nameKey:'NAMA BARU'})).status,400);
 assert.equal((await f.post({action:'approve',nameKey:'NAMA BARU',category:'mainstream'})).status,200);
 await f.post({action:'approve',nameKey:'NAMA BARU',category:'form6'});
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM teachers').get().n,2);
 assert.equal(f.sql.prepare('SELECT category FROM teachers WHERE name=?').get('NAMA BARU').category,'mainstream');
 await f.schedule('c',['NAMA BARU','AZWAN']);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM teachers').get().n,2);
});
test('admin approval is required on the server',async()=>{
 const f=fixture();assert.equal((await f.routes.GET(f.request(null,''))).status,401);
 assert.equal((await f.routes.POST(f.request({action:'sync'},'wrong'))).status,401);
});
test('rejected names stay out, and pending names from superseded schedules cannot be approved',async()=>{
 const f=fixture();await f.schedule('a',['TIDAK SAH']);await f.post({action:'reject',nameKey:'TIDAK SAH'});
 await f.schedule('b',['TIDAK SAH']);assert.equal(f.sql.prepare('SELECT status FROM relief_teacher_review').get().status,'rejected');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM teachers').get().n,0);
 await f.schedule('c',['BARU']);assert.equal((await f.post({action:'approve',nameKey:'TIDAK SAH',category:'form6'})).status,404);
});
test('manual match retains teacher identity and historical absences, relief inbox reads current name',async()=>{
 const f=fixture();f.sql.prepare('INSERT INTO teachers VALUES(?,?,?,?)').run('teacher-1','AINUL BT ALI','mainstream','old');
 f.sql.prepare("INSERT INTO absences(id,teacher_id,teacher_name,absence_date,created_at,updated_at) VALUES('a','teacher-1','AINUL BT ALI','2026-09-07','2026-09-07','2026-09-07')").run();
 await f.schedule('a',['AINUL BINTI ALI']);
 await f.post({action:'approve',nameKey:'AINUL BINTI ALI',teacherId:'teacher-1',category:'form6'});
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM teachers').get().n,1);
 assert.equal(f.sql.prepare('SELECT teacher_name FROM absences').get().teacher_name,'AINUL BT ALI');
 const query=read('app/api/relief-legacy/[...path]/route.ts').match(/if\(root==="absence-inbox"\).*?prepare\("([^"]+)"\)/)[1];
 assert.equal(f.sql.prepare(query).get().teacher_name,'AINUL BINTI ALI');
});
test('native admin view receives existing admin PIN and reloads its approved teacher list',()=>{
 assert.match(read('public/ekeberadaan-app/assets/page-MSybSbxR.js'),/SMKAPTeacherReview,\{adminPin:re,onRefresh:me\}/);
 assert.match(read('public/ekeberadaan-app/teacher-review.js'),/await onRefresh\(\)/);
});
