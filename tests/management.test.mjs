import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
import {validSchoolYear,canReadMaterial,isManagementAdmin,safeMaterialUrl,mappingDomain,managementSource} from '../app/management-model.ts';

function moduleUrl(path){let source=readFileSync(new URL(path,import.meta.url),'utf8');if(path.includes('management-catalog'))source=source.replace("'./skas-catalog'",JSON.stringify(moduleUrl('../app/skas-catalog.ts')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');}
const catalog=await import(moduleUrl('../app/management-catalog.ts'));
test('five divisions; unique folders and complete ancestry',()=>{
 assert.equal(catalog.managementSections.length,5);
 const ids=catalog.managementFolders.map(f=>f.id);assert.equal(new Set(ids).size,ids.length);
 for(const folder of catalog.managementFolders){assert.ok(catalog.managementPath(folder.id));assert.ok([...ids,...catalog.managementSections.map(s=>s.id)].includes(folder.parent));assert.ok(catalog.inManagementFolder(folder.id,folder.parent));}
 assert.equal(catalog.managementFolders.find(f=>f.id==='enam-3').standard,'3.3');
 assert.ok(catalog.managementPath('kurikulum-3-1-1').includes('Bahasa Melayu'));
 assert.ok(catalog.managementFolders.filter(f=>f.parent==='koko-2-1').length>=7);
});
test('private sources require owner or administrator; HTTPS links only',()=>{
 const record={visibility:'private',ownerEmail:'owner@example.com'};
 assert.equal(canReadMaterial(record,{email:'other@example.com',role:'teacher'}),false);
 assert.equal(canReadMaterial(record,{email:record.ownerEmail,role:'teacher'}),true);
 assert.equal(canReadMaterial(record,{email:'admin@example.com',role:'admin'}),true);
 assert.equal(canReadMaterial({...record,visibility:'staff'},{email:'other@example.com',role:'teacher'}),true);
 assert.equal(isManagementAdmin('teacher'),false);
 for(const link of ['javascript:alert(1)','http://example.com','https://user:pass@example.com'])assert.equal(safeMaterialUrl(link),'');
 assert.equal(safeMaterialUrl('https://drive.google.com/drive/folders/test'),'https://drive.google.com/drive/folders/test');
 assert.ok(validSchoolYear(2027));assert.equal(validSchoolYear('2027.2'),false);assert.equal(mappingDomain('3.2'),'Kokurikulum');
});
test('new migration preserves unrelated records',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE existing_reports(id TEXT); INSERT INTO existing_reports VALUES (\'keep\');');
 db.exec(readFileSync(new URL('../drizzle/0008_management_materials.sql',import.meta.url),'utf8'));
 assert.equal(db.prepare('SELECT id FROM existing_reports').get().id,'keep');
 assert.equal(db.prepare('SELECT count(*) AS count FROM management_materials').get().count,0);db.close();
});

function driveMock(){
 let created=0,released=0;const dirs=new Map(),files=new Map();
 const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
 function folder(name,parent,id=name){const children=[],localFiles=[];const f={getName:()=>name,getId:()=>id,getUrl:()=>`https://drive.google.com/drive/folders/${id}`,getParents:()=>iterator(parent?[parent]:[]),getFoldersByName:n=>iterator(children.filter(c=>c.getName()===n)),createFolder:n=>{created++;const child=folder(n,f,id+'/'+n);children.push(child);return child;},getFilesByName:n=>iterator(localFiles.filter(c=>c.getName()===n)),createFile:blob=>{created++;const file={getId:()=>id+'/'+blob.name,getName:()=>blob.name,getUrl:()=>`https://drive.google.com/file/d/${id}/${blob.name}`,getParents:()=>iterator([f]),isTrashed:()=>false,getSize:()=>blob.bytes.length,getMimeType:()=>blob.type,getBlob:()=>({getBytes:()=>blob.bytes})};files.set(file.getId(),file);localFiles.push(file);return file;}};dirs.set(id,f);return f;}
 const root=folder('PORTAL DIGITAL SMKAP',null,'1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE');
 const context={DriveApp:{getFolderById:id=>{assert.ok(dirs.has(id));return dirs.get(id);},getFileById:id=>files.get(id)},Utilities:{base64Decode:s=>Array.from(Buffer.from(s,'base64')),base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,type,name)=>({bytes,type,name})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>released++})},json_:x=>x};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../integrations/management-drive.gs',import.meta.url),'utf8'),context);
 return {run:body=>context.managementDrive_(body),created:()=>created,released:()=>released,root};
}
test('Drive upload uses school root/year and repeated request does not duplicate',()=>{
 const d=driveMock();assert.equal(d.run({action:'management_health'}).service,'management-v1');assert.equal(d.created(),0);
 const request={action:'management_upload',requestId:'12345678-1234-4234-a234-123456789abc',path:['2026','Kurikulum','Panitia'],name:'ujian.pdf',mimeType:'application/pdf',base64:Buffer.from('%PDF-1.7\n').toString('base64')};
 const first=d.run(request),created=d.created();assert.ok(first.id.includes('PENGURUSAN SEKOLAH/2026/Kurikulum/Panitia'));
 assert.equal(d.run(request).id,first.id);assert.equal(d.created(),created);assert.equal(d.released(),2);
 assert.equal(d.run({action:'management_download',id:first.id}).base64,request.base64);
 assert.throws(()=>d.run({...request,path:['2026','..','Panitia']}));assert.equal(d.created(),created);
});

test('API enforces login, administrator mapping, and open year before writes',async()=>{
 let actor=null,status='active',writes=[];
 const material={id:'existing',schoolYear:2026,folderId:'kurikulum-1',title:'Minit',documentType:'Minit mesyuarat dan tindakan susulan',storageKey:'',sourceUrl:'https://drive.google.com/file/d/test',notes:'',ownerEmail:'owner@example.com',ownerName:'Owner'};
 const db={prepare:sql=>({bind(...values){return{first:async()=>sql.includes('skas_years')?{status}:material,run:async()=>{writes.push({sql,values});return{success:true};}};}})};
 globalThis.__managementApiTest={portalActor:async()=>actor,managementStore:()=>({db}),...catalog,canReadMaterial,isManagementAdmin,managementSource,mappingDomain,safeMaterialUrl,validSchoolYear,skasStandards:[['3.1','Kurikulum']],managementDrive:async()=>({ok:true,service:'management-v1'}),encodeDriveBytes:()=>''};
 const raw=readFileSync(new URL('../app/api/pengurusan/route.ts',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
 const imports='const {portalActor,managementStore,managementFolders,managementDocumentTypes,managementPath,canReadMaterial,isManagementAdmin,managementSource,mappingDomain,safeMaterialUrl,validSchoolYear,skasStandards,managementDrive,encodeDriveBytes}=globalThis.__managementApiTest;';
 const module=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(imports+raw,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
 const request=()=>new Request('https://portal.example/api/pengurusan',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://portal.example'},body:JSON.stringify({action:'map',id:'existing',standardCode:'3.1',unitName:'Kurikulum'})});
 assert.equal((await module.POST(request())).status,401);
 actor={role:'teacher',email:'teacher@example.com'};assert.equal((await module.POST(request())).status,403);assert.equal(writes.length,0);
 actor={role:'admin',email:'admin@example.com'};assert.equal((await module.POST(request())).status,200);assert.equal(writes.length,1);assert.ok(writes[0].sql.includes("'pending'"));assert.equal(writes[0].values[1],2026);
 assert.equal(writes[0].sql.split('?').length-1,writes[0].values.length);
 status='closed';const log=console.error;console.error=()=>{};try{assert.equal((await module.POST(request())).status,400);}finally{console.error=log;}assert.equal(writes.length,1);
 const bad=new Request('https://portal.example/api/pengurusan',{method:'POST',headers:{Origin:'https://other.example'}});assert.equal((await module.POST(bad)).status,403);
 delete globalThis.__managementApiTest;
});
