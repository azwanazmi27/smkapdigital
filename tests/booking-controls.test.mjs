import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import * as blockModel from '../app/booking-block-model.ts';
import * as bookingModel from '../app/booking-model.ts';
import {bookingStartIsPast} from '../app/booking-time.ts';
function load(path,deps,fetcher=fetch){const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('require','exports','fetch',code)(name=>{if(!(name in deps))throw Error(name);return deps[name];},exports,fetcher);return exports;}
const baseBlock={id:'block',roomId:'legacy-1',weekday:1,startTime:'08:00',endTime:'09:00',effectiveFrom:'2026-10-01',reason:'Kelas ASK'};
const booking=(day,start='08:30',end='09:30')=>({id:'b',room:'Pusat Sumber Sekolah',applicantName:'Guru A',purpose:'PdPC',startDate:day,endDate:day,startTime:start,endTime:end,status:'Diluluskan',participants:1,ownerEmail:'a@school.my'});
test('weekly blocks respect Malaysia dates, boundaries, effective date and continuous multi-day intervals',()=>{
 const {blockConflict}=blockModel;
 assert.equal(blockConflict(baseBlock,booking('2026-10-05')).date,'2026-10-05');
 assert.equal(blockConflict(baseBlock,booking('2026-10-06')),null);
 assert.equal(blockConflict(baseBlock,booking('2026-10-05','07:00','08:00')),null);
 assert.equal(blockConflict(baseBlock,booking('2026-10-05','09:00','10:00')),null);
 assert.equal(blockConflict(baseBlock,booking('2026-09-28')),null);
 assert.equal(blockConflict(baseBlock,{...booking('2026-10-04'),endDate:'2026-10-07'}).date,'2026-10-05');
 assert.equal(blockConflict(baseBlock,{...booking('2026-10-05','10:00'),endDate:'2026-10-20'}).date,'2026-10-12');
 assert.equal(blockConflict({...baseBlock,effectiveFrom:'2027-01-01'},booking('2026-10-05')),null);
 assert.equal(blockConflict(baseBlock,{...booking('2026-10-01'),endDate:'2099-01-01'}).date,'2026-10-05');
 assert.equal(blockModel.validBookingDate('2026-02-30'),false);assert.equal(blockModel.validBookingTime('24:00'),false);
 const slots=blockModel.blockOccurrences([baseBlock],'2026-10-01','2026-10-15',[{id:'legacy-1',name:'Renamed room'}]);
 assert.deepEqual(slots.map(s=>s.startDate),['2026-10-05','2026-10-12']);assert.ok(slots.every(s=>s.status==='Disekat'&&!s.canDelete&&s.room==='Renamed room'));
});
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE portal_users(id TEXT,name TEXT,status TEXT,deleted_at TEXT); INSERT INTO portal_users VALUES('a','Guru A','active',NULL),('b','Guru B','active',NULL),('inactive','Inactive','inactive',NULL); CREATE TABLE push_subscriptions(id TEXT,user_id TEXT); INSERT INTO push_subscriptions VALUES('device-b','b'); CREATE TABLE staff_task_push_deliveries(task_id TEXT,subscription_id TEXT,user_id TEXT,status TEXT,PRIMARY KEY(task_id,subscription_id));");
 const DB={prepare(sql){let args=[];return{bind(...v){args=v;return this;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};},async all(){return{results:db.prepare(sql).all(...args)};},async first(){return db.prepare(sql).get(...args)||null;}}},async batch(ss){const result=[];db.exec('BEGIN');try{for(const s of ss)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
 let actor={id:'admin',name:'Admin',email:'admin@school.my',role:'admin'},rows=[],writes=0,pushFails=false;const pending=[],pushes=[];
 const env={DB},cloud={'cloudflare:workers':{env,waitUntil:p=>pending.push(p)}},auth={'../../server-auth':{portalActor:async()=>actor}};
 const catalog=load('app/lib/booking-rooms.ts',cloud),controls=load('app/lib/booking-controls.ts',cloud);
 const push={sendTaskNotices:async(notices,budget)=>{for(const n of notices){pushes.push(n);budget.remaining--;db.prepare("INSERT OR REPLACE INTO staff_task_push_deliveries VALUES(?,?,?,?)").run(n.taskId,'device-b',n.userId,pushFails?'failed':'sent');}}};
 const notices=load('app/lib/booking-notices.ts',{...cloud,'./booking-controls':controls,'./task-push':push,'../daily-notice-model':{TASKS_URL:'/?module=warga&tasks=1'}});
 const shared={...cloud,...auth,'../../lib/booking-rooms':catalog,'../../lib/booking-controls':controls,'../../booking-model':bookingModel,'../../booking-block-model':blockModel,'../../lib/booking-notices':notices};
 process.env.ETEMPAHAN_APPS_SCRIPT_URL='https://sheet.test';process.env.ETEMPAHAN_APPS_SCRIPT_TOKEN='fixture';
 const bookings=load('app/api/etempahan/route.ts',{...shared,'../../booking-time':{bookingStartIsPast},'../../etempahan-cache':{readBookingStatus:async(o,d,fn)=>({value:await fn()}),clearBookingStatus:async()=>{}}},async(url,init)=>{const input=JSON.parse(init.body);if(input.action==='etempahan_create'){writes++;return Response.json({ok:true,id:'new-booking',status:'Diluluskan'});}if(input.action==='etempahan_delete'){rows=rows.filter(r=>r.id!==input.id);return Response.json({ok:true});}return Response.json({ok:true,bookings:rows});});
 const deps={...shared,'../etempahan/route':bookings};
 const rooms=load('app/api/booking-rooms/route.ts',deps),blocks=load('app/api/booking-blocks/route.ts',deps);
 const request=(method,body={},query='')=>new Request('https://portal.test/api/test'+query,{method,headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 return {db,rooms,blocks,bookings,controls,catalog,notices,request,pending,pushes,getWrites:()=>writes,setRows:v=>rows=v,setActor:v=>actor=v,setPushFails:v=>pushFails=v};
}
const blockInput={roomId:'legacy-1',weekday:1,startTime:'08:00',endTime:'09:00',effectiveFrom:'2099-01-01',reason:'Kelas ASK'};
test('only admins manage coordinators and weekly blocks; settings persist through renames',async()=>{
 const f=fixture();f.setActor({id:'a',role:'teacher'});assert.equal((await f.blocks.POST(f.request('POST',blockInput))).status,403);assert.equal((await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Pusat Sumber',coordinatorId:'b'}))).status,403);
 f.setActor({id:'admin',role:'super_admin'});assert.equal((await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Pusat Sumber',coordinatorId:'inactive'}))).status,400);
 assert.equal((await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Pusat Sumber',coordinatorId:'b'}))).status,200);
 assert.equal((await f.controls.roomCoordinators())[0].userId,'b');
 assert.equal((await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Pusat Sumber Baru'}))).status,200);
 assert.equal((await f.controls.roomCoordinators())[0].userId,'b');
 assert.equal((await f.blocks.POST(f.request('POST',blockInput))).status,200);
 const saved=(await f.controls.bookingBlocks())[0];assert.equal(saved.reason,'Kelas ASK');
 assert.equal((await f.blocks.PUT(f.request('PUT',{...saved,startTime:'10:00',endTime:'11:00'}))).status,200);
 assert.equal((await f.controls.bookingBlocks())[0].startTime,'10:00');
 assert.equal((await f.blocks.DELETE(f.request('DELETE',{id:saved.id,confirm:true}))).status,200);assert.equal((await f.controls.bookingBlocks()).length,0);f.db.close();
});
test('block creation rejects existing bookings and overlapping blocks; room lease serializes writes',async()=>{
 const f=fixture();f.setRows([booking('2099-01-05')]); // Monday
 assert.equal((await f.blocks.POST(f.request('POST',blockInput))).status,409);assert.equal((await f.controls.bookingBlocks()).length,0);
 f.setRows([]);assert.equal((await f.blocks.POST(f.request('POST',blockInput))).status,200);assert.equal((await f.blocks.POST(f.request('POST',blockInput))).status,409);
 const token=await f.catalog.lockBookingRoom('legacy-1');assert.equal((await f.blocks.POST(f.request('POST',{...blockInput,weekday:2}))).status,409);await f.catalog.unlockBookingRoom('legacy-1',token);
 assert.equal((await f.blocks.POST(f.request('POST',{...blockInput,startTime:'25:00'}))).status,400);f.db.close();
});
test('booking POST enforces weekly blocks for all users before writing; successful notice targets only coordinator',async()=>{
 const f=fixture();await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Pusat Sumber Sekolah',coordinatorId:'b'}));await f.blocks.POST(f.request('POST',blockInput));
 const draft={...booking('2099-01-05'),email:'a@school.my'};
 for(const role of ['teacher','admin','super_admin']){f.setActor({id:'a',name:'Guru A',email:'a@school.my',role});assert.equal((await f.bookings.POST(f.request('POST',draft))).status,409);}
 assert.equal(f.getWrites(),0);assert.equal(f.pushes.length,0);
 const success=await f.bookings.POST(f.request('POST',{...draft,startTime:'09:00',endTime:'10:00'}));assert.equal(success.status,200);await Promise.all(f.pending);assert.equal(f.getWrites(),1);
 assert.equal(f.pushes.length,1);assert.equal(f.pushes[0].userId,'b');assert.match(f.pushes[0].body,/Guru A/);assert.match(f.pushes[0].body,/05\/01\/2099, 09:00/);assert.match(f.pushes[0].body,/05\/01\/2099, 10:00/);assert.equal(f.pushes[0].url,'/?module=warga&tasks=1');f.db.close();
});
test('coordinator workspace includes only supervised active bookings, deduplicates ranges and excludes expired/cancelled',async()=>{
 const f=fixture();await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Renamed room',coordinatorId:'b'}));const multi={...booking('2099-01-01'),endDate:'2099-01-03'};
 f.setRows([multi,multi,{...multi,id:'other',room:'Pusat Akses'},{...booking('2020-01-01'),id:'old'},{...multi,id:'cancelled',status:'Dibatalkan'}]);
 f.setActor({id:'b',name:'Guru B',email:'b@school.my',role:'teacher'});const result=await (await f.bookings.GET(f.request('GET',{},'?supervised=1'))).json();assert.equal(result.bookings.length,1);assert.equal(result.bookings[0].room,'Renamed room');assert.equal(result.bookings[0].canDelete,false);assert.equal(result.isCoordinator,true);
 f.setActor({id:'a',name:'Guru A',email:'a@school.my',role:'teacher'});assert.equal((await (await f.bookings.GET(f.request('GET',{},'?supervised=1'))).json()).bookings.length,0);f.db.close();
});
test('outbox retries failed sends, suppresses duplicate successes and cancels stale coordinator notices',async()=>{
 const f=fixture();await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:'Pusat Sumber Sekolah',coordinatorId:'b'}));
 const room={id:'legacy-1',name:'Pusat Sumber Sekolah'},row=booking('2099-01-05');await f.notices.queueBookingNotice(room,row);await f.notices.queueBookingNotice(room,row);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM booking_coordinator_notices').get().n,1);
 f.setPushFails(true);await f.notices.flushBookingNotices();assert.equal(f.pushes.length,1);
 await f.notices.flushBookingNotices();assert.equal(f.pushes.length,1);
 f.db.exec("UPDATE booking_coordinator_notices SET next_attempt_at='2020-01-01'");f.setPushFails(false);await f.notices.flushBookingNotices();assert.equal(f.pushes.length,2);await f.notices.flushBookingNotices();assert.equal(f.pushes.length,2);
 await f.notices.queueBookingNotice(room,{...row,id:'cancel'});await f.notices.cancelBookingNotice('cancel');await f.notices.flushBookingNotices();assert.equal(f.pushes.length,2);
 await f.notices.queueBookingNotice(room,{...row,id:'reassigned'});await f.rooms.PUT(f.request('PUT',{id:'legacy-1',name:room.name,coordinatorId:'a'}));await f.notices.flushBookingNotices();assert.equal(f.pushes.length,2);f.db.close();
});
