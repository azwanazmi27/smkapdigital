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

test('nama ringkas relief dipadankan dengan nama penuh akaun portal',()=>{
 assert.equal(model.sameReliefIdentity('NORASYIKIN BT MOHD ANUAR','NORASYIKIN BINTI MOHD ANUAR'),true);
 assert.equal(model.sameReliefIdentity('TG MOHD HILMI TG MOHD DAUD','TENGKU MOHD HILMI B. TENGKU MUHAMMAD DAUD'),true);
 assert.equal(model.sameReliefIdentity('WAN MAYZAITU WAHIDAH','WAN MAYZAITU WAHIDAH BINTI MAT RANI'),true);
 assert.equal(model.sameReliefIdentity('WAN HARUN BIN WAN ALI','WAN MAYZAITU WAHIDAH BINTI MAT RANI'),false);
 assert.equal(model.reliefNameKey('NORFATIMAWATI MAHMOOD'),model.reliefNameKey('NOR FATIMAWATI BINTI MAHMOOD'));
 assert.equal(model.reliefNameKey('MOHD IZZUDIN BIN ISHAK'),model.reliefNameKey('MUHAMMAD IZZUDDIN BIN ISHAK'));
});

test('padanan tugasan relief menerima bin dan nama ringkas hanya apabila identiti unik',()=>{
 const people=[{id:'azwan',name:'Noor Azwan Bin Azmi'},{id:'rahim',name:'Rahim Bin Salleh'}];
 const relief=[{reliefId:'jadual-azwan',reliefTeacher:'Noor Azwan Azmi'},{reliefId:'jadual-rahim',reliefTeacher:'Rahim Salleh'}];
 assert.equal(model.matchReliefTeacherId(relief,people[0],people),'jadual-azwan');
 assert.equal(model.matchReliefTeacherId([{reliefId:'jadual-azwan',reliefTeacher:'Azwan Azmi'}],people[0],people),'jadual-azwan');
 assert.equal(model.matchReliefTeacherId(relief,people[1],people),'jadual-rahim');
 assert.equal(model.matchReliefTeacherId([{reliefId:'norfatimawati',reliefTeacher:'NORFATIMAWATI MAHMOOD'}],{id:'nor',name:'NOR FATIMAWATI BINTI MAHMOOD'},[{id:'nor',name:'NOR FATIMAWATI BINTI MAHMOOD'},...people]),'norfatimawati');
 assert.equal(model.matchReliefTeacherId([{reliefId:'izzudin',reliefTeacher:'MOHD IZZUDIN BIN ISHAK'}],{id:'izzuddin',name:'MUHAMMAD IZZUDDIN BIN ISHAK'},[{id:'izzuddin',name:'MUHAMMAD IZZUDDIN BIN ISHAK'},...people]),'izzudin');
 assert.equal(model.matchReliefTeacherId(relief,{id:'orang-lain',name:'Azwan'},[...people,{id:'orang-lain',name:'Azwan'}]),'');
 assert.equal(model.matchReliefTeacherId([{reliefId:'a',reliefTeacher:'Azwan Azmi'}],people[0],[...people,{id:'azwan-lain',name:'Muhammad Azwan Azmi'}]),'');
 assert.equal(model.matchReliefTeacherId([{reliefId:'a',reliefTeacher:'Azwan Azmi'},{reliefId:'b',reliefTeacher:'Noor Azwan Azmi'}],people[0],people),'b');
 assert.equal(model.matchReliefTeacherId([{reliefId:'a',reliefTeacher:'Noor Ahmad Azmi'}],people[0],people),'');
 assert.equal(model.matchReliefTeacherId([{reliefId:'a',reliefTeacher:'Azwan Rahim Azmi'}],people[0],people),'');
});

test('pelan relief terkini hanya muncul kepada guru ganti yang dipilih dan hilang selepas pertukaran atau pembatalan',async()=>{
 const date='2026-09-25',base={absentId:'guru-absent',absentTeacher:'Cikgu Amin',periods:[3],lesson:{className:'2 IS',subject:'Matematik'}};
 const plan=(reliefId,cancelled=false)=>[{date,fileName:'Jadual Relief 25 September.pdf',assignments:[{...base,reliefId,cancelled}]}];
 const morning=new Date('2026-09-25T02:00:00Z');
 const mamat=await model.reliefTasksForTeacher(plan('mamat'),'mamat',date,morning);
 assert.equal(mamat.length,1);
 assert.equal(mamat[0].context,'Kelas 2 IS');
 assert.match(mamat[0].detail,/Waktu 3.*Subjek Matematik.*Ganti Cikgu Amin/);
 assert.equal(mamat[0].startDate,date);
 assert.equal(mamat[0].status,'Hari Ini');
 assert.deepEqual(await model.reliefTasksForTeacher(plan('rahim'),'mamat',date,morning),[]);
 assert.equal((await model.reliefTasksForTeacher(plan('rahim'),'rahim',date,morning)).length,1);
 assert.deepEqual(await model.reliefTasksForTeacher(plan('rahim',true),'rahim',date,morning),[]);
 assert.deepEqual(await model.reliefTasksForTeacher(plan('rahim'),'rahim','2026-09-24',new Date('2026-09-24T02:00:00Z')),[]);
 assert.deepEqual(await model.reliefTasksForTeacher(plan('rahim'),'rahim','2026-09-26',new Date('2026-09-25T16:00:00Z')),[]);
 assert.equal(model.reliefVisibleNow(new Date('2026-09-25T10:29:59Z')),true);
 assert.equal(model.reliefVisibleNow(new Date('2026-09-25T10:30:00Z')),false);
 assert.deepEqual(await model.reliefTasksForTeacher(plan('rahim'),'rahim',date,new Date('2026-09-25T10:30:00Z')),[]);
});

test('tarikh dokumen dan tindakan portal disahkan',()=>{
 assert.equal(model.validDate('2026-02-30'),false);assert.equal(model.validDate('2026-11-09'),true);
 assert.equal(model.workActions({kind:'paper',role:'Sediakan OPR program'})[0].module,'oprgenerator');
 assert.equal(model.workActions({kind:'duty',role:'Guru bertugas'})[0].module,'oprduty');
});
