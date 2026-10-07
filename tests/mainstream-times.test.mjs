import {reminderNameCache} from '../app/reminder-name-cache.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyMainstreamTimes,timingErrors} from '../app/mainstream-times.ts';
import {dueClasses} from '../app/class-reminder-model.ts';
const sql=readFileSync('drizzle/0017_mainstream_times.sql','utf8');
const config=JSON.parse(sql.match(/VALUES\('active','(.*?)',CURRENT_TIMESTAMP/)[1]);
const day=(weekday='Isnin',start=1,end=2,className='1 AB')=>({date:'2026-10-05',day:weekday,state:'ready',lessons:[{start,end,className,subject:'BM'}]});
test('approved PDF times distinguish ordinary weekdays and Friday',()=>{assert.deepEqual(timingErrors(config),[]);const a=applyMainstreamTimes(day(),config).lessons[0];assert.equal(a.startTime,'07:40');assert.equal(a.endTime,'08:40');const b=applyMainstreamTimes(day('Jumaat'),config).lessons[0];assert.equal(b.startTime,'08:00');assert.equal(b.endTime,'08:50');assert.equal(applyMainstreamTimes(day('Jumaat',10,10),config).lessons[0].endTime,'12:10');});
test('recess differs by class, not by teacher',()=>{assert.deepEqual(applyMainstreamTimes(day('Isnin',6,6,'3 AB'),config).lessons,[]);assert.equal(applyMainstreamTimes(day('Isnin',6,6,'4 AB'),config).lessons[0].startTime,'10:10');assert.deepEqual(applyMainstreamTimes(day('Jumaat',7,7,'5 AB'),config).lessons,[]);assert.equal(applyMainstreamTimes(day('Jumaat',7,7,'2 AB'),config).lessons[0].startTime,'10:30');});
test('missing times and unknown class never receive invented times',()=>{assert.equal(applyMainstreamTimes(day('Jumaat',11,11),config).lessons[0].startTime,undefined);assert.equal(applyMainstreamTimes(day('Isnin',1,1,'UNKNOWN'),config).lessons[0].startTime,undefined);});
test('merged sessions split around recess',()=>assert.deepEqual(applyMainstreamTimes(day('Isnin',5,7),config).lessons.map(l=>[l.start,l.end]),[[5,5],[7,7]]));
test('reminders due ten minutes before MYT start, never yesterday or after window',()=>{const d=applyMainstreamTimes(day(),config);assert.equal(dueClasses(d,new Date('2026-10-04T23:30:20Z')).length,1);assert.equal(dueClasses(d,new Date('2026-10-04T23:29:59Z')).length,0);assert.equal(dueClasses(d,new Date('2026-10-04T23:31:00Z')).length,1);assert.equal(dueClasses(d,new Date('2026-10-04T23:33:00Z')).length,0);assert.equal(dueClasses(d,new Date('2026-10-05T23:30:20Z')).length,0);});
test('invalid and overlapping admin edits rejected',()=>{const d=structuredClone(config);d.times[1].startTime='07:00';assert.ok(timingErrors(d).length);d.lowerBreak=0;assert.ok(timingErrors(d).includes('Waktu rehat tidak sah.'));});

test('scheduler targets only subscribed teacher and suppresses absence',async()=>{
 const ts=(await import('typescript')).default;
 const source=readFileSync('app/lib/class-reminders.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export async function','async function');
 let absent=false,sent=[];
 const directory=[{id:'a',name:'Guru A'},{id:'b',name:'Guru B'}];
 const env={DB:{prepare(sql){return {bind(){return this},async all(){return {results:sql.includes('portal_users')?directory:sql.includes('DISTINCT')?[{user_id:'a'}]:[]}},async first(){if(sql.includes('mainstream_times'))return {data_json:JSON.stringify(config)};return null;}}}}};
 const fn=new Function('notificationSettings','reminderNameCache','env','malaysiaDay','teachingDay','personalAbsenceTasks','applyMainstreamTimes','form6Lessons','staffNameMappings','sendTaskNotices','dueClasses',js+';return sendClassReminders;')(async()=>({classEnabled:true,leadMinutes:10}),reminderNameCache,env,()=> '2026-10-05',()=>day(),()=>absent?[{id:'absence:x',startDate:'2026-10-05',endDate:'2026-10-05'}]:[],applyMainstreamTimes,()=>null,async()=>({}),async notices=>{sent=notices},dueClasses);
 await fn(new Date('2026-10-04T23:30:10Z'));assert.equal(sent.length,1);assert.equal(sent[0].userId,'a');assert.equal(sent[0].ttl,600);assert.match(sent[0].body,/07:40/);
 absent=true;await fn(new Date('2026-10-04T23:30:10Z'));assert.equal(sent.length,0);
});
