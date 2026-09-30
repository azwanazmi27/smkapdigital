import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync('app/api/staff-work/route.ts','utf8').replace(/^import .*;\n/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/export /g,'');
async function setup(doc,actor={id:'owner',role:'staff'}){
 const batches=[],files=[],pending=[];
 const env={DB:{prepare(sql){return {sql,bind(...args){this.args=args;return this;},async first(){return doc;}}},async batch(statements){batches.push(statements);}},FILES:{async delete(key){files.push(key);}}};
 const api=new Function('env','portalActor','waitUntil',compiled+';return {POST};')(env,async()=>actor,p=>pending.push(p));
 const response=await api.POST(new Request('https://portal.test/api/staff-work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete_document',id:'paper-1'})}));
 await Promise.all(pending);return {response,batches,files};
}
test('only owner may delete a paper and its assignments in one batch',async()=>{
 const {response,batches,files}=await setup({owner_id:'owner',kind:'paper',file_key:'staff-work/paper-1'});
 assert.equal(response.status,200);assert.equal(batches.length,1);assert.equal(batches[0].length,3);
 assert.match(batches[0][1].sql,/DELETE FROM staff_work_assignments WHERE document_id=\?/);
 assert.deepEqual(batches[0][1].args,['paper-1']);assert.deepEqual(files,['staff-work/paper-1']);
});
test('another user and duty documents cannot be deleted through paper action',async()=>{
 for(const doc of [{owner_id:'someone-else',kind:'paper'},{owner_id:'owner',kind:'duty'}]){
  const result=await setup(doc);assert.equal(result.response.status,403);assert.equal(result.batches.length,0);assert.equal(result.files.length,0);
 }
});
test('missing document and unauthenticated request do not mutate storage',async()=>{
 for(const [doc,actor,status] of [[null,{id:'owner'},404],[{},null,401]]){
  const result=await setup(doc,actor);assert.equal(result.response.status,status);assert.equal(result.batches.length,0);assert.equal(result.files.length,0);
 }
});
