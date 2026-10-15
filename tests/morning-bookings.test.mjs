import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {personalMorningBookings,morningBookingsBody} from '../app/morning-bookings-model.ts';
import * as model from '../app/staff-work-model.ts';
import * as notice from '../app/daily-notice-model.ts';
import {reminderNameCache} from '../app/reminder-name-cache.ts';
import {selectRetryNotices} from '../app/notification-retry-model.ts';
import {defaultNotificationSettings} from '../app/notification-settings-model.ts';
const today='2026-10-15',now=new Date(today+'T07:25:00+08:00'),actor={id:'a',name:'Guru A',email:'a@school.my'};
const row={id:'1',room:'Legacy Lab',applicantName:'Guru A',ownerEmail:actor.email,purpose:'PdPC',startDate:today,endDate:today,startTime:'08:00',endTime:'09:00',status:'Diluluskan',participants:20};
const snapshot={rooms:[{id:'r',name:'Makmal Komputer (Baharu)',sourceName:'Legacy Lab',deletedAt:null}],coordinators:[{roomId:'r',userId:'b'}],bookings:[]};
test('morning room summary filters owners, coordinators, dates, cancellations and duplicates',()=>{
 const data={...snapshot,bookings:[row,row,{...row,id:'multi',startDate:'2026-10-14',endDate:'2026-10-17'}, {...row,id:'future',startDate:'2026-10-16',endDate:'2026-10-16'},{...row,id:'cancelled',status:'Dibatalkan'},{...row,id:'ended',startTime:'06:00',endTime:'07:00'},{...row,id:'other',ownerEmail:'other@school.my'}]};
 const own=personalMorningBookings(data,actor,today,now.getTime());assert.deepEqual(own.own.map(b=>b.id),['multi','1']);assert.equal(own.supervised.length,0);assert.equal(own.own[0].room,'Makmal Komputer (Baharu)');
 const supervisor=personalMorningBookings(data,{id:'b',name:'Guru B',email:'b@school.my'},today,now.getTime());assert.equal(supervisor.supervised.length,3);assert.equal(supervisor.own.length,0);
 assert.match(morningBookingsBody(own),/14\/10\/2026, 08:00 hingga 17\/10\/2026, 09:00/);
 assert.match(morningBookingsBody(supervisor),/Guru A/);
 const reassigned=personalMorningBookings({...data,coordinators:[]},{id:'b',name:'Guru B',email:'b@school.my'},today,now.getTime());assert.equal(reassigned.supervised.length,0);
});
test('long morning booking lists remain bounded for a mobile push',()=>{
 const rows=Array.from({length:50},(_,i)=>({...row,id:String(i),room:'Bilik '.repeat(100),applicantName:'Nama '.repeat(100)}));
 const body=morningBookingsBody({own:rows,supervised:rows});assert.match(body,/50 tempahan/);assert.match(body,/\+48 lagi/);assert.ok(new TextEncoder().encode(body).length<1400);assert.match(morningBookingsBody(null),/belum dapat disahkan/);
});
test('morning sends to booking-only teacher and coordinator with one source read; unrelated teacher excluded',async()=>{
 const users=[actor,{id:'b',name:'Guru B',email:'b@school.my'},{id:'c',name:'Guru C',email:'c@school.my'}];let reads=0,delivered=[];
 const env={DB:{prepare(sql){return {bind(){return this},async all(){return {results:sql.includes('push_subscriptions')?users.map(u=>({user_id:u.id})):[]}}}}}};
 const context={users:{results:users},schedule:null,timing:null,form6:null,plan:null,absences:{results:[]},mappings:{},settings:defaultNotificationSettings};
 const source=readFileSync('app/lib/daily-notices.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll('export async function','async function');
 const deps={env,...model,...notice,reminderNameCache,selectRetryNotices,personalMorningBookings,morningBookingsBody,morningBookingSnapshot:async()=>{reads++;return {...snapshot,bookings:[row]};},notificationSettings:async()=>defaultNotificationSettings,notificationContext:async()=>context,form6Lessons:()=>null,applyMainstreamTimes:d=>d,sendTaskNotices:async n=>delivered=n};
 const run=new Function(...Object.keys(deps),js+';return sendMorningSummaries;')(...Object.values(deps));
 await run(now);assert.equal(reads,1);assert.deepEqual(delivered.map(n=>n.userId),['a','b']);assert.match(delivered[0].body,/Tempahan Saya : 1 tempahan/);assert.match(delivered[1].body,/Bilik Seliaan Saya : 1 tempahan/);assert.match(delivered[1].body,/Guru A/);assert.ok(delivered.every(n=>n.url===notice.TASKS_URL));
});
