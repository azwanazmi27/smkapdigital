import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as model from '../app/staff-work-model.ts';
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

test('relief links to the PDF of its exact published plan',async()=>{
 const tasks=await model.reliefTasksForTeacher([{id:'published-plan',date:'2026-09-28',fileName:'Relief.pdf',assignments:[{reliefId:'teacher',absentTeacher:'Guru Asal',periods:[8],lesson:{className:'4 AK',subject:'MT'}}]}],'teacher','2026-09-28',new Date('2026-09-28T00:00:00Z'));
 assert.equal(tasks[0].pdfUrl,'/api/relief-legacy/relief-plans/published-plan/pdf');
 assert.match(tasks[0].detail,/Waktu 8 · Subjek MT · Ganti Guru Asal/);
});

test('printing publishes current assignments and PDF before invoking print',()=>{
 const source=readFileSync('public/ekeberadaan-app/assets/page-MSybSbxR.js','utf8');
 assert.ok(source.includes('if(Ge&&await rt())window.print()'));
 assert.ok(source.includes('assignments:q.assignments,pdfBase64:t'));
});

test('document names ignore honorifics and missing father names without guessing ambiguous people',()=>{
 const users=[{id:'wan',name:'Wan Harun Bin Wan Ali'},{id:'azwan',name:'Noor Azwan Bin Azmi'},{id:'siti',name:'Siti Aminah Binti Abdullah'}];
 for(const name of ['En.Wan Harun Bin Wan Ali','Encik Wan Harun','Tn. Haji Wan Harun','En Wan Harun B Wan Ali']) assert.equal(model.matchDocumentUserId(name,users),'wan');
 for(const name of ['Pn.Siti Aminah Bt Abdullah','Puan Siti Aminah','Pn. Hajah Siti Aminah Bte Abdullah']) assert.equal(model.matchDocumentUserId(name,users),'siti');
 assert.equal(model.matchDocumentUserId('Azwan Azmi',users),'azwan');
 assert.equal(model.matchDocumentUserId('Noor Azwan',users),'azwan');
 assert.equal(model.matchDocumentUserId('Wan',users),'');
 assert.equal(model.matchDocumentUserId('Wan Harun',[...users,{id:'other',name:'Wan Harun Bin Ahmad'}]),'');
 assert.equal(model.matchDocumentUserId('Pn Siti Aminah',[...users,{id:'other',name:'Siti Aminah Binti Hassan'}]),'');
 assert.equal(model.matchDocumentUserId('En.Wan Harun Bin Wan Ali',[...users,{id:'duplicate',name:'Wan Harun Wan Ali'}]),'');
});

test('document matching accepts joined and separated spelling in either source',()=>{
 assert.equal(model.matchDocumentUserId('Pn Nor Fatimawati',[{id:'nor',name:'Norfatimawati Binti Mahmood'}]),'nor');
 assert.equal(model.matchDocumentUserId('Norfatimawati Mahmood',[{id:'nor',name:'Nor Fatimawati Binti Mahmood'}]),'nor');
 assert.equal(model.matchDocumentUserId('Nurul Huda Abdullah',[{id:'huda',name:'Nurulhuda Binti Abdullah'}]),'huda');
 assert.equal(model.matchDocumentUserId('Nurul Huda Abdullah',[{id:'a',name:'Nurulhuda Abdullah'},{id:'b',name:'Nurul Huda Abdullah'}]),'');
});

test('personal timetable changes at Malaysia midnight and matches only the signed-in teacher',()=>{
 const users=[{id:'a',name:'Noor Azwan Bin Azmi'},{id:'b',name:'Rahim Ali'}];
 const teachers=[{name:'En. Azwan Azmi',schedule:{Isnin:[{start:3,end:4,subject:'BM',className:'1 A'}],Selasa:[{start:1,end:2,subject:'BI',className:'2 A'}]}}];
 const monday=model.teachingDay(teachers,users[0],users,new Date('2026-09-28T15:59:59Z'));
 assert.equal(monday.day,'Isnin');assert.equal(monday.lessons[0].subject,'BM');
 const tuesday=model.teachingDay(teachers,users[0],users,new Date('2026-09-28T16:00:00Z'));
 assert.equal(tuesday.day,'Selasa');assert.equal(tuesday.lessons[0].subject,'BI');
 assert.equal(model.teachingDay(teachers,users[1],users).state,'unmatched');
 assert.equal(model.teachingDay(teachers,users[0],users,new Date('2026-10-03T04:00:00Z')).lessons.length,0);
 assert.equal(model.teachingDay([...teachers,...teachers],users[0],users).state,'unmatched');
 assert.equal(model.teachingDay(null,users[0],users).state,'unavailable');
});

test('admin name mapping overrides automatic matching for both timetable and relief',()=>{
 const users=[{id:'a',name:'Ali Ahmad'},{id:'b',name:'Abu Bakar'}],key=model.documentNameKey('Ali Ahmad'),mappings={[key]:'b'};
 const teachers=[{name:'Ali Ahmad',schedule:{Isnin:[{start:1,end:2,subject:'BM',className:'1 A'}]}}];
 const now=new Date('2026-09-28T04:00:00Z');
 assert.equal(model.teachingDay(teachers,users[1],users,now,mappings).lessons.length,1);
 assert.equal(model.teachingDay(teachers,users[0],users,now,mappings).state,'unmatched');
 const assignments=[{reliefId:'teacher-1',reliefTeacher:'Ali Ahmad'}];
 assert.equal(model.matchReliefTeacherId(assignments,users[1],users,mappings),'teacher-1');
 assert.equal(model.matchReliefTeacherId(assignments,users[0],users,mappings),'');
});

test('personal absences appear before their date and expire after last Malaysia day',()=>{
 const users=[{id:'a',name:'Noor Azwan Bin Azmi'},{id:'b',name:'Ali Ahmad'}];
 const records=[{id:'x',teacherName:'Azwan Azmi',absenceDate:'2026-10-03',endDate:null,reason:'CRK',duration:'full',startTime:null,endTime:null}];
 const get=now=>model.personalAbsenceTasks(records,users[0],users,{},new Date(now));
 assert.equal(get('2026-10-01T02:00:00Z')[0].status,'Akan Datang');
 assert.equal(get('2026-10-03T15:59:59Z').length,1);
 assert.equal(get('2026-10-03T16:00:00Z').length,0);
 assert.equal(model.personalAbsenceTasks(records,users[1],users,{},new Date('2026-10-01')).length,0);
 records[0].endDate='2026-10-05';assert.equal(get('2026-10-04T02:00:00Z').length,1);
});

test('document patronymic abbreviations match the same directory identity',()=>{assert.equal(model.matchDocumentUserId('En. MOHD RASHIDI B ABD LATIFF',[{id:'r',name:'MOHD RASHIDI ABDUL LATIF'}]),'r');assert.equal(model.matchDocumentUserId('En. MOHD RASHIDI B ABD LATIFF',[{id:'r',name:'MOHD RASHIDI ABDUL LATIF'},{id:'s',name:'MOHD RASHIDI ABD LATIFF'}]),'');});
test('absence maps to active timetable identity using approved or unique name',()=>{const schedule=[{id:'t',name:'MOHD RASHIDI B ABD LATIFF'}],users=[{id:'u',name:'MOHD RASHIDI ABDUL LATIF'}];assert.equal(model.absenceScheduleTeacher('MOHD RASHIDI ABDUL LATIF','a',schedule,users,{}).id,'t');assert.equal(model.absenceScheduleTeacher('Unrelated','a',schedule,users,{},[{name:schedule[0].name,teacherId:'a'}]).id,'t');assert.equal(model.absenceScheduleTeacher('Unrelated','a',schedule,users,{}),null);});
test('program date fills all missing AJK dates and retains explicit exceptions',()=>{const rows=[{startDate:'2026-10-09',endDate:'2026-10-09'},{startDate:'',endDate:''},{startDate:'2026-10-08',endDate:'2026-10-08'}];const filled=model.fillProgramDates(rows,'2026-10-09','2026-10-09');assert.equal(filled[1].startDate,'2026-10-09');assert.equal(filled[1].endDate,'2026-10-09');assert.equal(filled[2].startDate,'2026-10-08');assert.equal(model.fillProgramDates(rows)[1].startDate,'');});
test('existing single-date draft fills later AJK without overwriting dates',()=>{assert.deepEqual(model.fillProgramDates([{startDate:'2026-10-09',endDate:''},{startDate:'',endDate:''}]),[{startDate:'2026-10-09',endDate:'2026-10-09'},{startDate:'2026-10-09',endDate:'2026-10-09'}]);});
