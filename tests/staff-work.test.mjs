import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const compiled=ts.transpileModule(readFileSync('app/staff-work-model.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const model=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const task=(id,type,status,startDate)=>({id,type,status,startDate,endDate:startDate,title:id,context:'',detail:'',source:'',unseen:false,actions:[]});

test('tarikh Malaysia bertukar tepat pada tengah malam tempatan',()=>{
 assert.equal(model.malaysiaDay(new Date('2026-09-21T15:59:59Z')),'2026-09-21');
 assert.equal(model.malaysiaDay(new Date('2026-09-21T16:00:00Z')),'2026-09-22');
 assert.deepEqual(model.currentWeek(new Date('2026-09-20T16:01:00Z')),{start:'2026-09-21',end:'2026-09-27'});
});

test('keutamaan ialah relief hari ini, guru bertugas, program hari ini, kemudian akan datang',()=>{
 const sorted=model.sortStaffTasks([task('future','program','Akan Datang','2026-09-30'),task('duty','duty','Sedang Berlangsung','2026-09-21'),task('today','program','Hari Ini','2026-09-21'),task('relief','relief','Hari Ini','2026-09-21')]);
 assert.deepEqual(sorted.map(value=>value.id),['relief','duty','today','future']);
});

test('kunci tugasan stabil untuk muat naik semula dan berubah bagi perubahan substantif',async()=>{
 const sameA=await model.stableTaskKey(['paper','user-1','AJK Dokumentasi','2026-09-30','2026-09-30']);
 const sameB=await model.stableTaskKey(['paper','user-1','ajk dokumentasi','2026-09-30','2026-09-30']);
 const changed=await model.stableTaskKey(['paper','user-1','Ketua Dokumentasi','2026-09-30','2026-09-30']);
 assert.equal(sameA,sameB);assert.notEqual(sameA,changed);
});

test('tarikh dokumen dan tindakan portal disahkan',()=>{
 assert.equal(model.validDate('2026-02-30'),false);assert.equal(model.validDate('2026-11-09'),true);
 assert.equal(model.workActions({kind:'paper',role:'Sediakan OPR program'})[0].module,'oprgenerator');
 assert.equal(model.workActions({kind:'duty',role:'Guru bertugas'})[0].module,'oprduty');
});
