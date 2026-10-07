import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
test('scheduler prioritizes time-sensitive reminders, isolates job errors and records failure',async()=>{
 const calls=[],writes=[],pending=[];let failClass=true;
 const env={DB:{prepare(sql){let params=[];return {bind(...p){params=p;return this},async run(){writes.push({sql,params})}}}}};
 const source=readFileSync('worker/notifications.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export default','const worker =').replace('export class','class');
 const runner=new Function('WorkerEntrypoint','sendClassReminders','sendReliefReminders','sendMorningSummaries','console',js+';return worker;')(class{},async(now,b)=>{calls.push(['class',now.toISOString(),b]);if(failClass)throw Error('fixture failure')},async(now,b)=>calls.push(['relief',now.toISOString(),b]),async(now,b)=>calls.push(['morning',now.toISOString(),b]),{error(){}});
 const event={scheduledTime:Date.parse('2026-10-07T07:25:30+08:00')};
 await runner.scheduled(event,env,{waitUntil:p=>pending.push(p)});await Promise.all(pending);
 assert.deepEqual(calls.map(c=>c[0]),['class','relief','morning']);
 assert.ok(calls.every(c=>c[1]==='2026-10-06T23:25:30.000Z'));assert.equal(calls[0][2],calls[2][2]);
 assert.ok(writes.some(w=>w.sql.includes("status='failed'")&&w.params.some(p=>String(p).includes('fixture failure'))));
 assert.equal(writes.filter(w=>w.sql.includes("status='completed'")).length,2);
 calls.length=0;await runner.scheduled(event,{...env,MIGRATION_MODE:'1'},{waitUntil:p=>pending.push(p)});assert.equal(calls.length,0);
});
