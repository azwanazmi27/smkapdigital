import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(compile(readFileSync('app/staff-work-model.ts','utf8'))).toString('base64'));
const db=new DatabaseSync(':memory:');
db.exec(readFileSync('drizzle/0014_huge_xorn.sql','utf8'));
db.exec("CREATE TABLE portal_users(id TEXT,name TEXT,status TEXT,deleted_at TEXT);CREATE TABLE admin_module_permissions(user_id TEXT,module_key TEXT,enabled INTEGER,updated_at TEXT,PRIMARY KEY(user_id,module_key));INSERT INTO portal_users VALUES('a','CIKGU A','active',NULL),('b','CIKGU B','active',NULL),('c','PENYELARAS','active',NULL)");
function prepare(sql){let values=[];return {bind(...v){values=v;return this;},async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return db.prepare(sql).run(...values);}};}
let actor={id:'a',role:'teacher'};
globalThis.workTest={env:{DB:{prepare,async batch(items){db.exec('BEGIN');try{const out=[];for(const i of items)out.push(await i.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}},FILES:{}},portalActor:async()=>actor,...model,generateAI:()=>{throw Error('Not used');},reserveAIUsage:()=>({})};
const routeSource=readFileSync('app/api/staff-work/route.ts','utf8').replace(/^import .*;\n/gm,'');
const route=await import('data:text/javascript;base64,'+Buffer.from('const {env,portalActor,generateAI,reserveAIUsage,normalName,currentWeek,validDate}=globalThis.workTest;\n'+compile(routeSource)).toString('base64'));
const post=(body)=>route.POST(new Request('https://test/api/staff-work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
const get=async()=>await (await route.GET(new Request('https://test/api/staff-work'))).json();
test('Malaysia week changes at midnight and validates dates',()=>{assert.deepEqual(model.currentWeek(new Date('2026-09-20T16:01:00Z')),{start:'2026-09-21',end:'2026-09-27'});assert.equal(model.validDate('2026-02-30'),false);assert.equal(model.validDate('2026-99-99'),false);assert.equal(model.validDate('2026-11-09'),true);});
test('personal tasks, coordinator replacement, ownership and completion persistence',async()=>{
 actor=null;assert.equal((await route.GET(new Request('https://test/api/staff-work'))).status,401);
 actor={id:'a',role:'teacher'};assert.equal((await get()).dutyAvailable,false);
 const {start,end}=model.currentWeek();db.prepare('INSERT INTO staff_work_documents VALUES(?,?,?,?,?,?,?,?,?)').run('d','admin','duty','Jadual','j.pdf','k','[]',0,'2026-01-01');
 const row={userId:'a',name:'CIKGU A',role:'Guru bertugas',startDate:start,endDate:end};
 assert.equal((await post({action:'publish',id:'d',assignments:[row]})).status,403);
 actor={id:'admin',role:'admin'};assert.equal((await post({action:'coordinator',userId:'c',enabled:true})).status,200);
 actor={id:'c',role:'teacher'};assert.equal((await post({action:'publish',id:'d',assignments:[{...row,startDate:'2026-99-99'}]})).status,400);
 assert.equal((await post({action:'publish',id:'d',assignments:[row]})).status,200);
 actor={id:'a',role:'teacher'};let data=await get();assert.equal(data.tasks.length,1);await post({action:'complete',id:data.tasks[0].id,completed:true});
 actor={id:'c',role:'teacher'};await post({action:'publish',id:'d',assignments:[row]});
 actor={id:'a',role:'teacher'};assert.equal((await get()).tasks[0].completed,1);
 actor={id:'c',role:'teacher'};await post({action:'publish',id:'d',assignments:[{...row,userId:'b',name:'CIKGU B'}]});
 actor={id:'a',role:'teacher'};data=await get();assert.equal(data.tasks.length,0);assert.equal(data.dutyAvailable,true);
 actor={id:'b',role:'teacher'};assert.equal((await get()).tasks[0].completed,0);
 actor={id:'c',role:'teacher'};assert.equal((await post({action:'coordinator',userId:'a',enabled:true})).status,403);
});

test('task actions use assigned responsibilities and supported portal destinations',()=>{
 assert.deepEqual(model.workActions({kind:'paper',role:'AJK makanan dan minuman'}),[]);
 assert.equal(model.workActions({kind:'paper',role:'Sediakan OPR program'} )[0].module,'oprgenerator');
 assert.equal(model.workActions({kind:'paper',role:'Menyediakan laporan program'} )[0].module,'oprgenerator');
 assert.deepEqual(model.workActions({kind:'duty',role:'Guru bertugas'}),[{module:'oprduty',label:'Buat laporan guru bertugas',tab:'daily'}]);
 assert.equal(model.workActions({kind:'duty',role:'Laporan mingguan guru bertugas'})[0].tab,'weekly');
 assert.deepEqual(model.workActions({kind:'paper',role:'Tempah dewan dan sediakan OPR'}).map(a=>a.module),['oprgenerator','etempahan']);
 assert.deepEqual(model.workActions({kind:'paper',role:'Dokumentasi gambar'}),[]);
});
