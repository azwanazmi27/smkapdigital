import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,deps={}){const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>deps[id],exports);return exports;}
const {permittedProfileUpdate}=load('app/profile-model.ts');
const current={name:'AZWAN',email:'azwan@example.test',position:'Guru',grade:'DG10'};
test('user may change valid SSPA grade but not identity',()=>{assert.deepEqual(permittedProfileUpdate({grade:'DG12'},current),{grade:'DG12'});for(const field of ['name','email','position'])assert.throws(()=>permittedProfileUpdate({[field]:'changed'},current));assert.throws(()=>permittedProfileUpdate({grade:'DG99'},current));});
let actor={id:'u1',role:'teacher'},writes=[];
const db={prepare(sql){return {bind(...values){return {all:async()=>({results:[{id:'a'},{id:'b'}]}),run:async()=>{writes.push({sql,values});}};}};}};
const route=load('app/api/portfolio/route.ts',{'cloudflare:workers':{env:{DB:db}},'../../server-auth':{portalActor:async()=>actor},'../../management-drive':{},'../../management-catalog':{}});
const request=ids=>new Request('https://school.test/api/portfolio',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
test('two highlights are saved in one owner-scoped update',async()=>{writes=[];assert.equal((await route.PUT(request(['a','b']))).status,200);assert.equal(writes.length,1);assert.match(writes[0].sql,/WHERE user_id=\?/);assert.deepEqual(writes[0].values,['a','b','u1']);});
test('third, duplicate and foreign highlights are rejected',async()=>{writes=[];assert.equal((await route.PUT(request(['a','b','c']))).status,400);assert.equal((await route.PUT(request(['a','a']))).status,400);assert.equal((await route.PUT(request(['other']))).status,403);assert.equal(writes.length,0);});
test('regular users cannot read school-wide expertise list',async()=>{assert.equal((await route.GET(new Request('https://school.test/api/portfolio?all=1'))).status,403);actor=null;assert.equal((await route.PUT(request([]))).status,401);});
test('portfolio upload stays pending and migration is additive',()=>{const source=fs.readFileSync('app/api/portfolio/route.ts','utf8');assert.match(source,/management_upload/);assert.match(source,/'pending'/);assert.match(source,/'Kepakaran Guru'/);assert.match(source,/m.deleted_at=''/);assert.doesNotMatch(fs.readFileSync('drizzle/0009_fluffy_prodigy.sql','utf8'),/DROP|DELETE|ALTER/i);});
