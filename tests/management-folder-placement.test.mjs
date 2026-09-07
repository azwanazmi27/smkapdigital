import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
function url(name){
 let code=readFileSync(new URL('../app/'+name+'.ts',import.meta.url),'utf8');
 code=code.replace(/from '((?:\.\.\/|\.\/)+[a-z-]+)'/g,(_,dep)=>{
  const name=dep.split('/').at(-1);
  if(name==='server-auth')return 'from '+JSON.stringify('data:text/javascript,export const portalActor=async()=>globalThis.folderTestActor');
  if(name==='management-store')return 'from '+JSON.stringify('data:text/javascript,export const managementStore=()=>globalThis.folderTestStore');
  return 'from '+JSON.stringify(url(name));
 });
 return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
}
const route=await import(url('api/opr-management/route'));
const {inManagementFolder}=await import(url('management-catalog'));
test('actual handlers persist a folder independently, count ancestors, retain URL and remove deleted sources',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE opr_reports(id TEXT,name TEXT,category TEXT,view_url TEXT,created_at TEXT); CREATE TABLE opr_intake_metadata(report_id TEXT,payload_json TEXT); CREATE TABLE skas_years(school_year INTEGER,status TEXT); INSERT INTO skas_years VALUES(2026,'active');");
 db.exec(readFileSync(new URL('../drizzle/0006_parallel_proteus.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../drizzle/0007_robust_risque.sql',import.meta.url),'utf8'));
 globalThis.folderTestStore={db:{prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args),run:async()=>db.prepare(sql).run(...args)};},all:async()=>({results:db.prepare(sql).all()})};}}};
 globalThis.folderTestActor={role:'admin',email:'admin@example.com'};
 db.prepare('INSERT INTO opr_reports VALUES(?,?,?,?,?)').run('r1','2026-09-01-Pemantauan kantin.pdf','Lain-lain · e-Pemantauan','https://drive.google.com/original','2026-09-01');
 const get=async()=>await (await route.GET(new Request('https://portal.test/api/opr-management?year=2026'))).json();
 const post=(folderId,documentType)=>route.POST(new Request('https://portal.test/api/opr-management',{method:'POST',headers:{origin:'https://portal.test','Content-Type':'application/json'},body:JSON.stringify({id:'r1',folderId,documentType})}));
 let data=await get();assert.equal(data.reports[0].folderId,'hem-9');assert.equal(data.reports[0].documentType,'Pemantauan dan penambahbaikan');
 assert.equal((await post('hem-14')).status,200);
 data=await get();assert.equal(data.reports[0].folderId,'hem-14');
 assert.equal(data.reports.filter(r=>inManagementFolder(r.folderId,'hem')).length,1);
 assert.equal(data.reports.filter(r=>inManagementFolder(r.folderId,'hem-14')).length,1);
 assert.equal(data.reports.filter(r=>inManagementFolder(r.folderId,'hem-9')).length,0);
 assert.equal(data.reports[0].openUrl,'https://drive.google.com/original');
 assert.equal(data.reports[0].mappingBasis,'manual');
 assert.equal((await post('hem-14','Program, aktiviti atau OPR')).status,200);
 data=await get();assert.equal(data.reports[0].documentType,'Program, aktiviti atau OPR');
 assert.equal((await post('hem-14','invalid')).status,400);
 db.prepare('INSERT INTO opr_reports VALUES(?,?,?,?,?)').run('d1','2026-08-24-Laporan-Harian-Guru-Bertugas.pdf','Pengurusan · Laporan Guru Bertugas · Laporan Harian','https://drive.google.com/daily','2026-08-24');
 db.prepare('INSERT INTO opr_reports VALUES(?,?,?,?,?)').run('w1','2026-Minggu-30-Laporan-Guru-Bertugas-Mingguan.pdf','Pengurusan · Laporan Guru Bertugas · Laporan Mingguan','https://drive.google.com/weekly','2026-08-28');
 db.prepare('INSERT INTO opr_reports VALUES(?,?,?,?,?)').run('a1','2026-08-25-Laporan-Perhimpunan.pdf','Laporan Perhimpunan','https://drive.google.com/assembly','2026-08-25');
 data=await get();
 assert.deepEqual(data.reports.filter(r=>r.id==='d1').map(r=>[r.folderId,r.documentType,r.sourceModule]),[['pengurusan-17-1','Analisis, laporan atau keberhasilan','Guru Bertugas Harian']]);
 assert.deepEqual(data.reports.filter(r=>r.id==='w1').map(r=>[r.folderId,r.documentType,r.sourceModule]),[['pengurusan-17-2','Analisis, laporan atau keberhasilan','Guru Bertugas Mingguan']]);
 assert.deepEqual(data.reports.filter(r=>r.id==='a1').map(r=>[r.folderId,r.documentType,r.sourceModule]),[['pengurusan-17-3','Analisis, laporan atau keberhasilan','Laporan Perhimpunan']]);
 // No SKAS table exists: both actions must succeed without it.
 assert.equal((await post('unknown')).status,400);
 globalThis.folderTestActor={role:'teacher',email:'teacher@example.com'};
 assert.equal((await post('hem-9')).status,403);
 globalThis.folderTestActor=null;assert.equal((await post('hem-9')).status,401);
 globalThis.folderTestActor={role:'admin',email:'admin@example.com'};
 db.exec("UPDATE skas_years SET status='closed'");
 assert.equal((await post('hem-9')).status,409);
 db.exec("DELETE FROM opr_reports WHERE id='r1'");
 assert.equal((await get()).reports.some(r=>r.id==='r1'),false);
 db.close();
});
