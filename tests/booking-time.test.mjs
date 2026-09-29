import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingStartIsPast,nextBookingSlot} from '../app/booking-time.ts';
test('Malaysia booking cannot start before current time',()=>{
 const now=Date.parse('2026-09-29T13:00:00+08:00');
 assert.equal(bookingStartIsPast('2026-09-29','12:00',now),true);
 assert.equal(bookingStartIsPast('2026-09-29','15:00',now),false);
 assert.equal(bookingStartIsPast('2026-09-28','15:00',now),true);
 assert.equal(bookingStartIsPast('2026-09-30','08:00',now),false);
});
test('default slot moves to tomorrow at midnight',()=>{
 const slot=nextBookingSlot(Date.parse('2026-09-29T23:59:30+08:00'));
 assert.deepEqual(slot,{start:{date:'2026-09-30',time:'00:15'},end:{date:'2026-09-30',time:'01:15'}});
});
