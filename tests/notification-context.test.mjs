import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {malaysiaDay} from '../app/staff-work-model.ts';
import {defaultNotificationSettings} from '../app/notification-settings-model.ts';
test('cron reads one fresh batch with current Malaysian date and latest relief plan',async()=>{
 let batches=0,revision=1,queries=[];
 const env={DB:{prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this}}},async batch(q){batches++;queries=q;return [{results:[{id:'a',name:'Guru A'}]},{results:[]},{results:[]},{results:[]},{results:[{id:'plan-'+revision,date:'2026-10-08',fileName:'Relief',assignmentsJson:'[]'}]},{results:[]},{results:[{name_key:'GURU A',user_id:'a'}]},{results:[{user_id:'a'}]},{results:[]}];}}};
 const source=readFileSync('app/lib/notification-context.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export async function','async function');
 const read=new Function('env','malaysiaDay','defaultNotificationSettings',js+';return notificationContext;')(env,malaysiaDay,defaultNotificationSettings);
 const now=new Date('2026-10-07T23:25:00Z'),first=await read(now);assert.equal(batches,1);assert.equal(first.settings.morningTime,'07:25');assert.equal(first.plan.id,'plan-1');assert.equal(first.mappings['GURU A'],'a');
 assert.deepEqual(queries.find(q=>q.sql.includes('FROM absences')).params,['2026-10-08','2026-10-08']);
 assert.match(queries.find(q=>q.sql.includes('FROM relief_plans')).sql,/WHERE date=\? ORDER BY rowid DESC LIMIT 1/);
 revision=2;assert.equal((await read(now)).plan.id,'plan-2');assert.equal(batches,2);
});
