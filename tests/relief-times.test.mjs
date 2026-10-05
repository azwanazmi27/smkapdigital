import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {timedReliefTasks} from '../app/relief-times.ts';
import {dueClasses} from '../app/class-reminder-model.ts';
const config=JSON.parse(readFileSync('drizzle/0017_mainstream_times.sql','utf8').match(/VALUES\('active','(.*?)',CURRENT_TIMESTAMP/)[1]);
const plan=(date='2026-10-09')=>({id:'p',date,fileName:'Relief',assignments:[{reliefId:'a',reliefTeacher:'Guru A',absentId:'b',absentTeacher:'Guru B',periods:[1,2,4],lesson:{className:'4 AB',subject:'BM'}}]});
test('relief display uses Friday times without mutating plan or PDF link',async()=>{const p=plan(),before=JSON.stringify(p);const [r]=await timedReliefTasks(p,'a',config,new Date('2026-10-09T07:50:00+08:00'));assert.equal(JSON.stringify(p),before);assert.match(r.task.detail,/08:00–08:50, 09:15–09:40/);assert.equal(r.task.pdfUrl,'/api/relief-legacy/relief-plans/p/pdf');assert.equal(dueClasses({date:p.date,lessons:r.sessions},new Date('2026-10-09T07:50:00+08:00')).length,1);});
test('cancelled, reassigned and yesterday relief cannot notify original teacher',async()=>{const p=plan();p.assignments[0].cancelled=true;assert.deepEqual(await timedReliefTasks(p,'a',config,new Date('2026-10-09T07:50:00+08:00')),[]);delete p.assignments[0].cancelled;p.assignments[0].reliefId='c';assert.deepEqual(await timedReliefTasks(p,'a',config,new Date('2026-10-09T07:50:00+08:00')),[]);assert.deepEqual(await timedReliefTasks(p,'c',config,new Date('2026-10-10T07:50:00+08:00')),[]);});
test('unconfigured relief remains visible but cannot notify',async()=>{const [r]=await timedReliefTasks(plan(),'a',null,new Date('2026-10-09T07:50:00+08:00'));assert.match(r.task.detail,/Masa belum/);assert.equal(dueClasses({date:'2026-10-09',lessons:r.sessions},new Date('2026-10-09T07:50:00+08:00')).length,0);});

test('scheduled delivery follows latest replacement and ignores cancellation',async()=>{
 const ts=(await import('typescript')).default;
 const {malaysiaDay,matchReliefTeacherId,reliefVisibleNow}=await import('../app/staff-work-model.ts');
 const src=readFileSync('app/lib/relief-reminders.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export async function','async function');
 let p=plan(),sent=[];const queries=[];const users=[{id:'user-a',name:'Guru A'},{id:'user-c',name:'Guru C'}];
 const env={DB:{prepare(sql){queries.push(sql);return {bind(){return this},async first(){return sql.includes('relief_plans')?{...p,assignmentsJson:JSON.stringify(p.assignments)}:{data_json:JSON.stringify(config)}},async all(){return {results:users}}}}}};
 const fn=new Function('env','malaysiaDay','matchReliefTeacherId','reliefVisibleNow','timedReliefTasks','dueClasses','staffNameMappings','sendTaskNotices',js+';return sendReliefReminders;')(env,malaysiaDay,matchReliefTeacherId,reliefVisibleNow,timedReliefTasks,dueClasses,async()=>({}),async n=>{sent=n});
 const now=new Date('2026-10-09T07:50:00+08:00');await fn(now);assert.equal(sent.length,1);assert.equal(sent[0].userId,'user-a');assert.equal(sent[0].ttl,600);
 p.assignments[0].reliefId='c';p.assignments[0].reliefTeacher='Guru C';await fn(now);assert.equal(sent.length,1);assert.equal(sent[0].userId,'user-c');
 p.assignments[0].cancelled=true;await fn(now);assert.equal(sent.length,0);
 assert.ok(queries.some(q=>q.includes('WHERE date=? ORDER BY rowid DESC LIMIT 1')));
});
