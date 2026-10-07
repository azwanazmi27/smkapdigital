import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as model from '../app/staff-work-model.ts';
import * as notice from '../app/daily-notice-model.ts';
import {reminderNameCache} from '../app/reminder-name-cache.ts';
import {defaultNotificationSettings} from '../app/notification-settings-model.ts';
test('morning absence overrides schedule only for matching current-day teacher',async()=>{
 let delivered=[];const users=[{id:'a',name:'Azwan bin Azmi'},{id:'b',name:'Guru B'}];
 const env={DB:{prepare(sql){return {bind(){return this},async all(){return {results:sql.includes('FROM portal_users')?users:sql.includes('FROM absences')?[{id:'x',teacherName:'Azwan Azmi',absenceDate:'2026-10-07',endDate:'2026-10-07',reason:'MC',duration:'full'}]:sql.includes('push_subscriptions')?[{user_id:'a'},{user_id:'b'}]:[]}},async first(){return null}}}}};
 let source=readFileSync('app/lib/daily-notices.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll('export async function','async function');
 const deps={env,...model,...notice,reminderNameCache,notificationSettings:async()=>defaultNotificationSettings,staffNameMappings:async()=>({}),form6Lessons:()=>null,applyMainstreamTimes:d=>d,sendTaskNotices:async n=>delivered=n};
 const run=new Function(...Object.keys(deps),js+';return sendMorningSummaries;')(...Object.values(deps));
 await run(new Date('2026-10-07T07:25:00+08:00'));assert.equal(delivered.length,1);assert.equal(delivered[0].userId,'a');assert.match(delivered[0].body,/Selamat pagi Cikgu Azwan bin Azmi/);assert.match(delivered[0].body,/kerana MC[\s\S]*Semoga cikgu cepat sembuh/);assert.doesNotMatch(delivered[0].body,/Waktu Mengajar/);
});
