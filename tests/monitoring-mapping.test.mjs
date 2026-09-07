import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
function url(name){let code=readFileSync(new URL('../app/'+name+'.ts',import.meta.url),'utf8');code=code.replace(/from '\.\/(monitoring-mapping|skas-catalog|achievement-mapping)'/g,(_,dep)=>'from '+JSON.stringify(url(dep)));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');}
const {monitoringCategory:category,monitoringTopics,resolveMonitoring,monitoringTitle}=await import(url('monitoring-mapping'));
const {suggestSkasMappings,skasSignalProfile,skasDomains}=await import(url('skas-catalog'));
const {managementFolders}=await import(url('management-catalog'));
test('every monitoring topic has an existing folder and SKAS unit',()=>{
 for(const topic of monitoringTopics){
  assert.ok(managementFolders.some(f=>f.id===topic.folderId));
  assert.ok(skasDomains.find(d=>d.name===topic.domain).units.includes(topic.unit));
  const [suggestion]=suggestSkasMappings({category,title:'Pemantauan',metadata:{monitoringFocus:topic.id}});
  assert.equal(suggestion.standardCode,topic.standard);
  assert.equal(suggestion.evidenceType,'Pemantauan dan penambahbaikan');
 }
});
test('venue and author in old filenames cannot determine topic',()=>{
 const name='2026-08-31-E-PEMANTAUAN-Semakan umum__TEMPAT__Kantin__PEMANTAU__Guru Disiplin.pdf';
 assert.equal(monitoringTitle(name),'Semakan umum');
 assert.equal(resolveMonitoring(name,{}),null);
 assert.equal(resolveMonitoring('Pemantauan PdP di kantin',{}).id,'pdp');
});
test('unknown and conflicting subjects remain for manual review',()=>{
 for(const title of ['Pemantauan kelas','Pemantauan kantin dan asrama'])assert.deepEqual(suggestSkasMappings({category,title}),[]);
 assert.equal(resolveMonitoring('Pemantauan kantin',{monitoringFocus:'review'}),null);
});
test('explicit subject takes precedence and learning profiles are isolated',()=>{
 assert.equal(resolveMonitoring('Pemantauan di kantin',{monitoringFocus:'pdp'}).id,'pdp');
 assert.notEqual(skasSignalProfile({category,metadata:{monitoringFocus:'pdp'}}),skasSignalProfile({category,metadata:{monitoringFocus:'canteen'}}));
 assert.equal(resolveMonitoring('Pemantauan kantin',{}).id,'canteen');
});
test('shared SQL includes monitoring, preserves original link, and withdraws deleted sources',()=>{
 const db=new DatabaseSync(':memory:');
 const skas=readFileSync(new URL('../app/api/skas/route.ts',import.meta.url),'utf8');
 db.exec(skas.match(/prepare\("(CREATE TABLE IF NOT EXISTS skas_evidence [^"]+)"/)[1]);
 db.exec("CREATE TABLE opr_reports(id TEXT,name TEXT,category TEXT,view_url TEXT,created_at TEXT); CREATE TABLE opr_intake_metadata(report_id TEXT,payload_json TEXT);");
 db.exec(readFileSync(new URL('../drizzle/0006_parallel_proteus.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../drizzle/0007_robust_risque.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO opr_reports VALUES(?,?,?,?,?)').run('monitor-1','2026-08-31-E-PEMANTAUAN-Pemantauan kantin.pdf',category,'https://drive.google.com/file/d/original','2026-08-31');
 const linked=readFileSync(new URL('../app/api/opr-management/route.ts',import.meta.url),'utf8');
 const query=linked.match(/prepare\("(SELECT r.id[^"]+)"/)[1];
 assert.equal(db.prepare(query).all()[0].viewUrl,'https://drive.google.com/file/d/original');
 const insert=[...skas.matchAll(/prepare\("(INSERT INTO skas_evidence[^"]+)"/g)].map(m=>m[1]).find(sql=>sql.includes("'portal'"));
 db.prepare(insert).run('evidence-1',2026,'Hal Ehwal Murid','Kantin dan Pemakanan','Pemantauan dan penambahbaikan','Pemantauan kantin','3.3','https://drive.google.com/file/d/original','Cadangan','admin@example.com','Admin','e-Pemantauan','monitor-1','now','now');
 assert.equal(db.prepare(query).all()[0].manualFolder,null);
 const drive=readFileSync(new URL('../app/api/drive/route.ts',import.meta.url),'utf8');
 const withdraw=drive.match(/prepare\("(UPDATE skas_evidence SET status='source_deleted'[^"]+)"/)[1];
 db.prepare(withdraw).run('later','monitor-1');
 assert.equal(db.prepare('SELECT status FROM skas_evidence').get().status,'source_deleted');
 db.close();
});
