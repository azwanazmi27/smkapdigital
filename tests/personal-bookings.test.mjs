import test from 'node:test';
import assert from 'node:assert/strict';
import {activePersonalBookings,bookingEnd,bookingDay,ownsBooking} from '../app/booking-model.ts';
import {createBookingClient} from '../app/booking-client.ts';
const actor={email:'a@school.my',name:'Guru A'},b={id:'one',room:'Bilik',applicantName:'Guru A',ownerEmail:'a@school.my',purpose:'PdPC',status:'Diluluskan',startDate:'2026-10-15',endDate:'2026-10-17',startTime:'08:00',endTime:'14:00',participants:1};
test('personal bookings include future and multi-day bookings once, exclude others and cancelled records',()=>{
 const rows=[b,b,{...b,id:'future',startDate:'2027-01-01',endDate:'2027-01-01'},{...b,id:'other',ownerEmail:'b@school.my'},{...b,id:'cancelled',status:'Dibatalkan'}];
 assert.deepEqual(activePersonalBookings(rows,actor,Date.parse('2026-10-14T23:00:00+08:00')).map(x=>x.id),['one','future']);
});
test('booking expires exactly at Malaysia end time regardless of server timezone',()=>{
 const end=Date.parse('2026-10-17T06:00:00Z');assert.equal(bookingEnd(b),end);
 assert.equal(activePersonalBookings([b],actor,end-1).length,1);
 assert.equal(activePersonalBookings([b],actor,end).length,0);
 assert.equal(bookingDay(Date.parse('2026-10-14T17:00:00Z')),'2026-10-15');
});
test('stored email is authoritative even when names coincide; legacy full name fallback remains',()=>{
 assert.equal(ownsBooking({...b,ownerEmail:'b@school.my'},actor),false);
 assert.equal(ownsBooking({...b,ownerEmail:'A@SCHOOL.MY',applicantName:'Old Name'},actor),true);
 assert.equal(ownsBooking({...b,ownerEmail:''},actor),true);
 assert.equal(ownsBooking({...b,ownerEmail:'',applicantName:'Guru'},actor),false);
});
test('success notification waits for server confirmation and carries the confirmed booking',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),outcomes=[];
 const client=createBookingClient(async()=>pending,result=>outcomes.push(result));
 const write=client.mutate('POST',{}, {...b,id:'pending'});assert.equal(outcomes.length,0);
 resolve(Response.json({success:true,booking:b}));await write;
 assert.equal(outcomes.length,1);assert.equal(outcomes[0].success,true);assert.equal(outcomes[0].booking.id,'one');
});
test('failure notification gives server reason and never emits success or retries creation',async()=>{
 let writes=0;const outcomes=[];
 const client=createBookingClient(async(_,opts)=>{if(opts.method==='POST'){writes++;return Response.json({error:'Bilik telah ditempah.'},{status:409});}return Response.json({bookings:[]});},result=>outcomes.push(result));
 await assert.rejects(client.mutate('POST',{},b));assert.equal(writes,1);assert.equal(outcomes.length,1);assert.equal(outcomes[0].success,false);assert.equal(outcomes[0].message,'Bilik telah ditempah.');
});
