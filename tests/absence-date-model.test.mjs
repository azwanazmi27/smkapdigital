import {test} from 'node:test';
import assert from 'node:assert/strict';
import {absenceLate,absencePeople,malaysiaDate} from '../public/ekeberadaan-app/absence-date-model.js';
test('1am Malaysia is late for same-day CRK, regardless of UTC date',()=>{
 assert.equal(absenceLate({reason:'CRK',absenceDate:'2026-10-02',createdAt:'2026-10-01T17:00:00Z'}),true);
 assert.equal(absenceLate({reason:'CRK',absenceDate:'2026-10-02',createdAt:'2026-10-01T09:59:59Z'}),false);
 assert.equal(absenceLate({reason:'CRK',absenceDate:'2026-10-02',createdAt:'2026-10-01T10:00:00Z'}),true);
 assert.equal(absenceLate({reason:'MC',absenceDate:'2026-10-02',createdAt:'2026-10-01T17:00:00Z'}),false);
 assert.equal(malaysiaDate(new Date('2026-10-01T17:00:00Z')),'2026-10-02');
});
test('selected day counts unique teachers and includes overlapping multi-day records',()=>{
 const rows=[{teacherId:'a',absenceDate:'2026-10-01',endDate:'2026-10-03',category:'form6'},{teacherId:'a',absenceDate:'2026-10-02',category:'form6'},{teacherId:'b',absenceDate:'2026-10-02',category:'mainstream'}];
 assert.equal(absencePeople(rows,'2026-10-02'),2);
 assert.equal(absencePeople(rows,'2026-10-03'),1);
 assert.equal(absencePeople(rows,'2026-10-04'),0);
 assert.equal(absencePeople(rows,'2026-10-02','form6'),1);
});
