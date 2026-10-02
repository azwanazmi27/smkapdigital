import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dutyPeriods,dutyDates} from '../app/duty-calendar.ts';
test('week 34 keeps September 23 separate from Nor Fatimawati September 28',()=>{
 const periods=dutyPeriods([{reportDate:'2026-09-23'},{reportDate:'2026-09-28'},{reportDate:'2026-09-30'}]);
 assert.deepEqual(periods,['2026-09-28','2026-09-21']);
 assert.deepEqual(dutyDates(periods[0]),['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02']);
 assert.ok(!dutyDates(periods[0]).includes('2026-09-23'));
});
test('missing daily data does not invent dates or records from weekly PDF',()=>{
 assert.deepEqual(dutyPeriods([]),[]);
});
test('period boundaries remain correct across years and timezone changes',()=>{
 assert.deepEqual(dutyDates('2026-12-28'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01']);
});
