import test from 'node:test';
import assert from 'node:assert/strict';
import {morningDue,morningBody,reliefReadyBody,TASKS_URL} from '../app/daily-notice-model.ts';
test('morning trigger uses Malaysia weekdays at 07:25',()=>{assert.equal(morningDue(new Date('2026-10-05T23:25:00Z')),true);assert.equal(morningDue(new Date('2026-10-05T23:24:00Z')),false);assert.equal(morningDue(new Date('2026-10-09T23:25:00Z')),false);assert.equal(morningDue(new Date('2026-10-10T23:25:00Z')),false);});
test('announcement includes Malay weekday and ddmmyyyy',()=>{assert.match(reliefReadyBody('2026-10-06'),/Selasa, 06102026/);assert.equal(TASKS_URL,'/?module=warga&tasks=1');});
test('personal summaries distinguish missing relief from zero assignments',()=>{assert.match(morningBody('A',3,2,1,0),/Waktu Mengajar : 3 waktu\nRelief : 2 relief\nGuru Bertugas : Ya/);assert.match(morningBody('B',0,0,0,0),/Relief : 0 relief/);assert.match(morningBody('C',null,null,0,0),/Relief : Belum disediakan/);});

test('morning retry window ends at 07:45 MYT',()=>{assert.equal(morningDue(new Date('2026-10-05T23:44:00Z')),true);assert.equal(morningDue(new Date('2026-10-05T23:45:00Z')),false);});
test('absence greeting uses individual name and actual reason, including MC variants',async()=>{
 const {absenceMorningBody}=await import('../app/daily-notice-model.ts');
 assert.equal(absenceMorningBody('A',['MC']),'Selamat pagi Cikgu A\n\nCikgu dilaporkan tidak hadir kerana MC, semoga cikgu cepat sembuh.');
 assert.match(absenceMorningBody('B',['CRK']),/Cikgu B[\s\S]*kerana CRK, semoga urusan cikgu dipermudahkan/);
 assert.match(absenceMorningBody('C',['Cuti Sakit']),/cepat sembuh/);
 assert.equal(absenceMorningBody('A',['MC','MC']).match(/kerana/g).length,1);
});
