import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
test('task delivery selects only the assigned user devices, never broadcasts',async()=>{
 const queries=[],sent=[];
 const subscriptions=[{id:'device-a',userId:'teacher-a',endpoint:'https://push.invalid/a',p256dh:'key',auth:'auth'},{id:'device-b',userId:'teacher-b',endpoint:'https://push.invalid/b',p256dh:'key',auth:'auth'}];
 const env={VAPID_SERVER_PUBLIC_KEY:'public',VAPID_SERVER_PRIVATE_KEY:'private',DB:{prepare(sql){let values=[];return {bind(...args){values=args;return this},async run(){return {meta:{changes:1}}},async all(){queries.push({sql,values});assert.match(sql,/WHERE s.user_id=\?/);return {results:subscriptions.filter(s=>s.userId===values[0])}}}}}};
 let source=readFileSync('app/lib/task-push.ts','utf8').replace(/import .*?from 'cloudflare:workers';/, '').replace(/import .*?from '@block65\/webcrypto-web-push';/,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export async function','async function');
 const send=new Function('env','buildPushPayload','fetch',compiled+';return sendTaskNotices;')(env,async()=>({method:'POST'}),async url=>{sent.push(url);return {ok:true}});
 await send([{userId:'teacher-a',taskId:'relief:1',title:'Relief',body:'Kelas 4 AK',url:'/?module=warga'}]);
 assert.deepEqual(sent,['https://push.invalid/a']);assert.equal(queries[0].values[0],'teacher-a');
});
