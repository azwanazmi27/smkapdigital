import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {jsPDF} from 'jspdf';
import {DatabaseSync} from 'node:sqlite';
globalThis.migrationJsPdf=jsPDF;
const cache=new Map();
function mod(name){if(cache.has(name))return cache.get(name);let code=ts.transpileModule(readFileSync(new URL('../app/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/from ["']([^"']+)["']/g,(_,dep)=>{if(dep.endsWith('services/ai/router'))return 'from "data:text/javascript,export const generateAI=async(input)=>globalThis.mockGenerate(input)"';if(dep.endsWith('services/ai/rate-limit'))return 'from "data:text/javascript,export const allowAIRequest=()=>true"';if(dep==='jspdf')return 'from "data:text/javascript,export const jsPDF=globalThis.migrationJsPdf"';if(dep==='cloudflare:workers')return 'from "data:text/javascript,export const env=globalThis.migrationEnv"';if(dep.endsWith('server-auth'))return 'from "data:text/javascript,export const portalActor=async()=>globalThis.migrationActor"';return 'from '+JSON.stringify(mod(path.posix.normalize(path.posix.join(path.posix.dirname(name),dep))));});
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(name,url);return url;}
const db=new DatabaseSync(':memory:');
for(const file of ['0013_big_daimon_hellstrom.sql','0006_skas_evidence.sql','0011_boring_professor_monster.sql','0012_whole_photon.sql'])db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
function prepare(sql){return {bind(...args){return {first:async()=>db.prepare(sql).get(...args),all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>db.prepare(sql).run(...args),_run:()=>db.prepare(sql).run(...args)};}};}
globalThis.migrationEnv={DB:{prepare,async batch(items){db.exec('BEGIN');try{const result=items.map(x=>x._run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}}};

const model=await import(mod('evidence-ai-model')),route=await import(mod('api/documents/route')),service=await import(mod('document-service')),ai=await import(mod('api/ai/evidence-mapping/route'));
const actor={id:'teacher-test',email:'teacher@example.com',name:'Guru Ujian',role:'teacher'};
const good={standardCode:'3.1',domain:'Kurikulum',unitName:'Panitia · Bahasa Melayu',evidenceType:'Minit mesyuarat dan tindakan susulan',panitiaCategory:'03',reason:'Minit merekodkan tindakan susulan panitia.',confidence:'tinggi'};
const req=body=>new Request('https://school.example/api',{method:'POST',body:JSON.stringify(body)});
test('AI mapping validates catalogue combinations and rejects invented values',()=>{
 assert.equal(model.parseEvidenceSuggestion(good).standardLabel,'Pengurusan kurikulum');
 for(const change of [{standardCode:'9'},{standardCode:'3.2'},{unitName:'Unit rekaan'},{evidenceType:'Tidak diketahui'},{panitiaCategory:'99'},{reason:''}])assert.equal(model.parseEvidenceSuggestion({...good,...change}),null);
});
test('AI endpoint requires login and returns a genuine provider suggestion without provider details',async()=>{
 globalThis.migrationActor=null;assert.equal((await ai.POST(req({title:'Minit'}))).status,401);
 globalThis.migrationActor=actor;let called=false;globalThis.mockGenerate=async input=>{called=true;assert.match(input.userPrompt,/Minit Bahasa Melayu/);return {text:JSON.stringify(good),provider:'test'}};
 const r=await ai.POST(req({title:'Minit Bahasa Melayu'}));assert.equal(r.status,200);assert.equal(called,true);const x=await r.json();assert.equal(x.suggestion.standardCode,'3.1');assert.equal(x.provider,undefined);
});
test('AI invalid input, invalid mapping and provider outage leave manual workflow available',async()=>{
 globalThis.migrationActor=actor;assert.equal((await ai.POST(req({title:''}))).status,400);
 globalThis.mockGenerate=async()=>({text:JSON.stringify({...good,standardCode:'9'})});assert.equal((await ai.POST(req({title:'Minit'}))).status,422);
 globalThis.mockGenerate=async()=>{throw Error('secret provider error')};const r=await ai.POST(req({title:'Minit'}));assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(await r.json()),/secret/);
});
test('Panitia mapping persists once as pending evidence, guards versions and preserves approved evidence',async()=>{
 globalThis.migrationActor=actor;
 const doc=await service.registerDocument(actor,{title:'Minit Panitia',documentType:'Minit Mesyuarat',sourceModule:'e-Panitia',schoolYear:2026,status:'draft',file:{id:'link_test_evidence',name:'Minit',viewUrl:'https://example.com/minit.pdf'}});
 const body={action:'map-evidence',documentId:doc.documentId,versionId:doc.versionId,mapping:good};
 assert.equal((await route.POST(req({...body,versionId:'old'}))).status,409);
 assert.equal((await route.POST(req({...body,mapping:{...good,standardCode:'9'}}))).status,400);
 assert.equal((await route.POST(req(body))).status,200);
 let ev=db.prepare('SELECT * FROM skas_evidence WHERE source_record_id=?').get(doc.documentId);assert.equal(ev.status,'pending');assert.equal(ev.school_year,2026);assert.equal(ev.source_url,'https://example.com/minit.pdf');
 assert.equal(db.prepare("SELECT mapping_status FROM document_mappings WHERE document_id=? AND destination_module='skas'").get(doc.documentId).mapping_status,'pending_review');
 db.prepare("UPDATE skas_evidence SET status='approved' WHERE id=?").run(ev.id);
 const r=await route.POST(req(body));assert.equal((await r.json()).existing,true);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skas_evidence').get().n,1);assert.equal(db.prepare('SELECT status FROM skas_evidence').get().status,'approved');
 assert.equal((await route.POST(req({action:'archive',documentId:doc.documentId,confirm:true}))).status,200);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM skas_evidence').get().n,0);
});

const usage=await import(mod('services/ai/usage')),draftModel=await import(mod('epanitia-ai-model')),draftRoute=await import(mod('api/ai/panitia-document/route'));
test('daily quota permits exactly three concurrent requests for each teacher',async()=>{
 const teacher={...actor,id:'quota-teacher'};const results=await Promise.all(Array.from({length:10},()=>usage.reserveAIUsage(teacher)));
 assert.equal(results.filter(x=>!x.error).length,3);assert.equal((await usage.getAIUsage(teacher)).remaining,0);
 const another=await usage.reserveAIUsage({...teacher,id:'different-teacher'});assert.equal(another.usage.remaining,2);
});
test('admin and super_admin are exempt; teachers reset at Malaysian midnight',async()=>{
 for(const role of ['admin','super_admin']){const admin={...actor,id:'quota-'+role,role};for(let i=0;i<4;i++)assert.equal((await usage.reserveAIUsage(admin)).error,undefined);assert.equal((await usage.getAIUsage(admin)).limit,null);}
 assert.equal(usage.usageDay(new Date('2026-09-14T15:59:59Z')),'2026-09-14');assert.equal(usage.usageDay(new Date('2026-09-14T16:00:00Z')),'2026-09-15');
});
test('AI patch ignores names, dates, amounts and approvals, preserving existing row facts',()=>{
 const current={title:'Dokumen asal',approvedBy:'',items:[{item:'Pen',quantity:3,unitPrice:2,unit:'batang'}]};
 const patch=draftModel.parsePanitiaAIPatch('pcg',{purpose:'Keperluan PdP',items:[{item:'Pen biru',unit:'batang',quantity:99,unitPrice:999}],approvedBy:'AI',requestDate:'2099-01-01'});
 const next=draftModel.applyPanitiaAIPatch('pcg',current,patch);assert.equal(next.items[0].quantity,3);assert.equal(next.items[0].unitPrice,2);assert.equal(next.approvedBy,'');assert.equal(next.requestDate,undefined);assert.equal(next.items[0].item,'Pen biru');assert.equal(draftModel.parsePanitiaAIPatch('__proto__',{}),null);
});
test('every Panitia template generates a reviewable structured draft through the shared AI service',async()=>{
 for(const [template,fields] of Object.entries(draftModel.panitiaAIFields)){
 globalThis.migrationActor={...actor,id:'draft-'+template};
 const patch=Object.fromEntries(Object.entries(fields).map(([key,f])=>[key,f.kind==='rows'?[Object.fromEntries(Object.keys(f.columns).map(col=>[col,'Teks cadangan']))]:f.kind==='list'?['Teks cadangan']:'Teks cadangan']));
 globalThis.mockGenerate=async()=>({text:JSON.stringify(patch)});
 const r=await draftRoute.POST(req({template,notes:'Catatan guru untuk dokumen ujian',data:{title:'Ujian'}}));assert.equal(r.status,200,template);assert.deepEqual((await r.json()).patch,patch);
 }
});
test('generation shares its allowance with evidence mapping, cannot be bypassed with a new endpoint',async()=>{
 globalThis.migrationActor={...actor,id:'shared-quota'};globalThis.mockGenerate=async()=>({text:JSON.stringify(good)});
 for(let i=0;i<3;i++)assert.equal((await ai.POST(req({title:'Minit Panitia'}))).status,200);
 const r=await draftRoute.POST(req({template:'appointment',notes:'Bidang tugas setiausaha panitia'}));assert.equal(r.status,429);assert.match((await r.json()).error,/Had 3/);
});
