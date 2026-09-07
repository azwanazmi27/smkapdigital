import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const source=readFileSync(new URL('../app/api/ekeberadaan/route.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
function fixture(){
 const sql=new DatabaseSync(':memory:');
 const db={prepare(q){let args=[];return {bind(...a){args=a;return this;},async first(){return sql.prepare(q).get(...args)||null;},async all(){return {results:sql.prepare(q).all(...args)};},async run(){return sql.prepare(q).run(...args);}};},async batch(items){sql.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const {GET,POST,DELETE}=new Function('env','portalActor','upsertAbsenceToSheet',compiled+';return {GET,POST,DELETE};')({DB:db,RELIEF_ADMIN_PIN:'123456'},async()=>null,async()=>true);
 const req=(method,reason,pin='123456')=>new Request('https://test/api/ekeberadaan?resource=reasons'+(method==='DELETE'?'&reason='+encodeURIComponent(reason):''),{method,headers:{'Content-Type':'application/json','x-admin-pin':pin},...(method==='POST'?{body:JSON.stringify({reason})}:{})});
 return {sql,list:async()=>{const r=await GET(req('GET'));assert.equal(r.status,200);return (await r.json()).reasons;},add:(r,p)=>POST(req('POST',r,p)),remove:(r,p)=>DELETE(req('DELETE',r,p))};
}
test('removed defaults stay removed across requests, including an empty list',async()=>{
 const f=fixture();assert.ok((await f.list()).includes('MC'));
 assert.equal((await f.remove('MC')).status,200);assert.ok(!(await f.list()).includes('MC'));
 for(const reason of await f.list())await f.remove(reason);
 assert.deepEqual(await f.list(),[]);assert.deepEqual(await f.list(),[]);
});
test('add normalizes whitespace, prevents case duplicates, and can restore a removed reason',async()=>{
 const f=fixture();await f.list();await f.add('  Cuti   Bersalin  ');await f.add('cuti bersalin');
 assert.equal((await f.list()).filter(x=>x.toLowerCase()==='cuti bersalin').length,1);
 await f.remove('MC');await f.add('MC');assert.ok((await f.list()).includes('MC'));
});
test('reason mutations require an existing admin credential and preserve historical absence values',async()=>{
 const f=fixture();await f.list();assert.equal((await f.add('Tidak Sah','wrong')).status,403);assert.equal((await f.remove('MC','')).status,403);
 f.sql.prepare("INSERT INTO absences(id,teacher_id,teacher_name,category,absence_date,reason,duration,created_at,updated_at) VALUES('a','t','Guru','form6','2026-09-07','MC','full','now','now')").run();
 await f.remove('MC');assert.equal(f.sql.prepare("SELECT reason FROM absences WHERE id='a'").get().reason,'MC');
});
