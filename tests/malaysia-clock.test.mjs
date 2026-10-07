import test from 'node:test';
import assert from 'node:assert/strict';
import {malaysiaClock} from '../app/malaysia-clock.ts';
import {morningDue} from '../app/daily-notice-model.ts';
test('Malaysia clock stays correct across UTC midnight, local midnight, year and leap day',()=>{
 for(const instant of ['2026-10-07T23:25:00Z','2026-10-08T00:00:00Z','2026-10-08T15:59:59Z','2026-10-08T16:00:00Z','2026-12-31T16:00:00Z','2028-02-28T16:00:00Z']){
  const now=new Date(instant),clock=malaysiaClock(now);
  assert.equal(clock.date,new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now));
  assert.equal(clock.time,new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now));
  assert.equal(clock.day,new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',weekday:'long'}).format(now));
 }
});
test('morning recovery uses local school days including Monday in UTC Sunday',()=>{
 assert.equal(morningDue(new Date('2026-10-11T23:25:00Z')),true);
 assert.equal(morningDue(new Date('2026-10-09T23:25:00Z')),false);
 assert.equal(morningDue(new Date('2026-10-07T23:24:59Z')),false);
 assert.equal(morningDue(new Date('2026-10-07T23:44:59Z')),true);
 assert.equal(morningDue(new Date('2026-10-07T23:45:00Z')),false);
});
