import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function url(path){let code=readFileSync(new URL(path,import.meta.url),'utf8');code=code.replace(/from '\.\/(management-catalog|skas-catalog|monitoring-mapping|achievement-mapping)'/g,(_,name)=>'from '+JSON.stringify(url('../app/'+name+'.ts')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');}
const {resolveOprManagement:route,oprSchoolYear}=await import(url('../app/opr-management-routing.ts'));
const {linkedManagementFolder,resolveSkasManagement}=await import(url('../app/opr-management-routing.ts'));
test('manual mapping moves the reference, not the source file',()=>{
 const chosen=linkedManagementFolder('hem-9',{domain:'Hal Ehwal Murid',unit:'Asrama',notes:'Pemetaan manual: oleh pentadbir',status:'approved'});
 assert.equal(chosen.folderId,'hem-14');assert.equal(chosen.basis,'manual');
 assert.equal(resolveSkasManagement('Kokurikulum','Badan Beruniform · Kadet Remaja Sekolah').name,'Kadet Remaja Sekolah');
});
test('unknown manual unit needs review and rejected mappings do not override',()=>{
 const mapping={domain:'Hal Ehwal Murid',unit:'Unit tidak wujud',notes:'Pemetaan manual: semakan',status:'pending'};
 assert.equal(linkedManagementFolder('hem-9',mapping).folderId,'');
 assert.equal(linkedManagementFolder('hem-9',{...mapping,status:'rejected'}).folderId,'hem-9');
 assert.equal(linkedManagementFolder('koko-6',{...mapping,domain:'Pencapaian',unit:'Kokurikulum'}).folderId,'koko-6');
});
const {sixthFormMappings,suggestSkasMappings,skasDomains}=await import(url('../app/skas-catalog.ts'));
const {achievementCategory,achievementInfo,achievementFolder}=await import(url('../app/achievement-mapping.ts'));
test('archive legacy fields exclude venue and preserve international result',()=>{
 const info=achievementInfo('2026-08-31-ARKIB-Kejayaan KRS__TEMPAT__Kantin__PERINGKAT__Antarabangsa__BIDANG__Kokurikulum__PENCAPAIAN__Johan__PENYEDIA__Azwan.pdf',{});
 assert.equal(info.title,'Kejayaan KRS');assert.equal(info.field,'Kokurikulum');assert.equal(info.level,'Antarabangsa');assert.equal(info.result,'Johan');
 assert.equal(achievementFolder(info.field),'koko-6');
 assert.equal(achievementFolder('Lain-lain'),'');
});
test('archive structured unit routes to KRS and achievement suggestion stays pending-candidate data',()=>{
 const metadata={achievementField:'Kokurikulum',achievementLevel:'Negeri',achievementResult:'Johan',achievementUnit:'Kokurikulum · Badan Beruniform · Kadet Remaja Sekolah'};
 const info=achievementInfo('fail.pdf',metadata);
 assert.equal(route(info.unitCategory,'Kejayaan di kantin').name,'Kadet Remaja Sekolah');
 const [suggestion]=suggestSkasMappings({category:achievementCategory,title:'Kejayaan KRS',metadata});
 assert.equal(suggestion.standardCode,'5.4');assert.equal(suggestion.unitName,'Kokurikulum');
 assert.match(suggestion.reason,/Negeri/);assert.match(suggestion.reason,/Johan/);
});
test('all Sixth Form mappings resolve existing folders and registered specific SKAS units',()=>{
 for(const [name,id,domain] of sixthFormMappings){
  const category='Tingkatan Enam · '+name;
  assert.equal(route(category,'Perjumpaan mingguan').id,id);
  const suggestion=suggestSkasMappings({category,title:'Perjumpaan mingguan'})[0];
  assert.equal(suggestion.domain,domain);
  assert.equal(suggestion.unitName,'Tingkatan Enam · '+name);
  assert.ok(skasDomains.find(d=>d.name===domain).units.includes(suggestion.unitName));
 }
});
test('Sixth Form association meeting is not achievement or a canteen activity',()=>{
 const category='Tingkatan Enam · Kokurikulum Tingkatan Enam · Persatuan Tingkatan Enam';
 assert.equal(route(category,'Perjumpaan mingguan di kantin').id,'enam-4-1');
 const result=suggestSkasMappings({category,title:'Perjumpaan mingguan di kantin'});
 assert.equal(result[0].standardCode,'3.2');
 assert.equal(result[0].unitName,'Tingkatan Enam · Persatuan Tingkatan Enam');
 assert.ok(!result.some(s=>s.standardCode==='5.4'));
 assert.ok(suggestSkasMappings({category,metadata:{competition:{enabled:true}}}).some(s=>s.standardCode==='5.4'));
});
test('STPM examination stays in examination folder, not excellence',()=>assert.equal(route('Tingkatan Enam · Pentaksiran & Peperiksaan STPM','Taklimat STPM').id,'enam-2-1'));
test('canteen category routes to HEM canteen',()=>assert.equal(route('HEM · Kantin','Mesyuarat kantin').id,'hem-9'));
test('sixth form excellence at canteen stays academic',()=>assert.equal(route('Tingkatan Enam · Subjek Tingkatan Enam · Pengajian Am','Program Kecemerlangan Tingkatan Enam di kantin').id,'enam-2-3'));
test('venue never routes a generic programme into canteen',()=>assert.equal(route('Pengurusan','Majlis di kantin'),null));
test('unknown and ambiguous categories need review',()=>{assert.equal(route('Lain-lain','Pemantauan kantin'),null);assert.equal(route('Kurikulum','Program akademik'),null);});
test('explicit unit routes without title guesses',()=>{assert.equal(route('Kurikulum · Bahasa · Bahasa Melayu','Program di kantin').id,'kurikulum-3-1-1');assert.equal(route('HEM · SPBT','Taklimat').id,'hem-5');});
test('school year comes from programme date or dated filename, not upload time',()=>{assert.equal(oprSchoolYear({programDate:'2027-01-03'},'2026-12-31-old.pdf'),2027);assert.equal(oprSchoolYear({},'2026-08-31-program.pdf'),2026);assert.equal(oprSchoolYear({},'undated.pdf'),null);});
