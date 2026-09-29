import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookingClient,bookingRows,bookingQuery,bookingClientFor,clearBookingClients} from '../app/booking-client.ts';
const day='2026-09-29', end='2026-10-05';
const booking={id:'ET-1',room:'Bilik Gerakan',applicantName:'Ujian',purpose:'Mesyuarat',startDate:day,startTime:'08:00',endDate:day,endTime:'09:00',participants:1,status:'Diluluskan',canDelete:true};
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:value=>resolve(value)};};
const flush=()=>new Promise(r=>setTimeout(r,0));
test('preloaded week serves room status immediately; repeat read shares the request',async()=>{
 const gate=deferred();let calls=0;
 const client=createBookingClient(async()=>{calls++;return gate.promise;});
 const a=client.refresh(day,end),b=client.refresh(day,day);
 assert.equal(calls,1);
 gate.resolve(Response.json({bookings:[booking]}));await Promise.all([a,b]);
 assert.equal(bookingRows(client.getSnapshot(),day,day)[0].id,booking.id);
 await client.refresh(day,day);assert.equal(calls,1);
});
test('slow refresh keeps prior records on screen and an error retains the snapshot',async()=>{
 let fail=false;const gate=deferred();
 const client=createBookingClient(async()=>fail?gate.promise:Response.json({bookings:[booking]}));
 await client.refresh(day,day);fail=true;
 const reading=client.refresh(day,day,true);
 assert.equal(bookingRows(client.getSnapshot(),day,day).length,1);
 gate.resolve(Response.json({error:'Offline'},{status:502}));await reading;
 assert.equal(bookingRows(client.getSnapshot(),day,day).length,1);
 assert.equal(bookingQuery(client.getSnapshot(),day,day).error,'Offline');
});
test('booking appears pending synchronously, cannot be sent twice and is never marked approved early',async()=>{
 const gate=deferred();let writes=0;let saved=false;
 const client=createBookingClient(async(_url,opts)=>{if(opts.method==='POST'){writes++;return gate.promise;}return Response.json({bookings:saved?[booking]:[]});});
 await client.refresh(day,day);
 const pending={...booking,id:'pending-1'};
 const writing=client.mutate('POST',{},pending);
 assert.equal(bookingRows(client.getSnapshot(),day,day)[0].status,'Sedang disahkan');
 assert.equal(bookingRows(client.getSnapshot(),day,day)[0].canDelete,false);
 await assert.rejects(client.mutate('POST',{}, {...pending,id:'pending-2'}));assert.equal(writes,1);
 saved=true;gate.resolve(Response.json({success:true,booking}));await writing;await flush();
 assert.equal(bookingRows(client.getSnapshot(),day,day).length,1);
 assert.equal(bookingRows(client.getSnapshot(),day,day)[0].id,'ET-1');
});
test('a conflicting booking rolls back the pending row and preserves existing bookings',async()=>{
 const client=createBookingClient(async(_url,opts)=>opts.method==='POST'?Response.json({error:'Bilik bertindih'},{status:409}):Response.json({bookings:[booking]}));
 await client.refresh(day,day);
 await assert.rejects(client.mutate('POST',{}, {...booking,id:'pending'}),/bertindih/);await flush();
 assert.deepEqual(bookingRows(client.getSnapshot(),day,day).map(r=>r.id),['ET-1']);
 assert.equal(client.getSnapshot().failed,true);
});
test('delete closes the flow immediately but keeps the record pending until confirmation; failure restores actions',async()=>{
 const gate=deferred();const client=createBookingClient(async(_url,opts)=>opts.method==='DELETE'?gate.promise:Response.json({bookings:[booking]}));
 await client.refresh(day,day);const writing=client.mutate('DELETE',{},booking);
 assert.equal(bookingRows(client.getSnapshot(),day,day)[0].status,'Sedang dipadam');
 gate.resolve(Response.json({error:'Tidak dibenarkan'},{status:403}));await assert.rejects(writing);await flush();
 assert.equal(bookingRows(client.getSnapshot(),day,day)[0].canDelete,true);
});
test('late pre-mutation read cannot resurrect a deleted booking',async()=>{
 const old=deferred();let reads=0;let deleted=false;
 const client=createBookingClient(async(_url,opts)=>{if(opts.method==='DELETE'){deleted=true;return Response.json({success:true});}reads++;if(reads===2)return old.promise;return Response.json({bookings:deleted?[]:[booking]});});
 await client.refresh(day,day);const reading=client.refresh(day,day,true);
 await client.mutate('DELETE',{},booking);assert.equal(bookingRows(client.getSnapshot(),day,day).length,0);
 old.resolve(Response.json({bookings:[booking]}));await reading;
 assert.equal(bookingRows(client.getSnapshot(),day,day).length,0);
});
test('cache and pending operations are scoped to the signed-in account',()=>{
 clearBookingClients();assert.notEqual(bookingClientFor('a'),bookingClientFor('b'));assert.equal(bookingClientFor('a'),bookingClientFor('a'));
 const old=bookingClientFor('a');clearBookingClients();assert.notEqual(old,bookingClientFor('a'));
});
