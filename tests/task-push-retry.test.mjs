import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

test('failed and abandoned deliveries retry, successful and in-flight deliveries deduplicate',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE notification_delivery_details(task_id TEXT,subscription_id TEXT,title TEXT,error TEXT,updated_at TEXT,PRIMARY KEY(task_id,subscription_id)); CREATE TABLE portal_users(id TEXT,name TEXT,status TEXT,deleted_at TEXT); CREATE TABLE push_subscriptions(id TEXT,user_id TEXT,endpoint TEXT,p256dh TEXT,auth TEXT); INSERT INTO portal_users VALUES('a','Teacher','active',NULL); INSERT INTO push_subscriptions VALUES('device','a','https://push.invalid','key','auth');");
 const env={VAPID_SERVER_PUBLIC_KEY:'public',VAPID_SERVER_PRIVATE_KEY:'private',DB:{prepare(sql){let values=[];return {bind(...args){values=args;return this},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}}},async all(){return {results:db.prepare(sql).all(...values)}}}}}};
 let source=readFileSync('app/lib/task-push.ts','utf8').replace(/import .*?from 'cloudflare:workers';/,'').replace(/import .*?from '@block65\/webcrypto-web-push';/,'');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export async function','async function');
 let calls=0,ok=false;
 const send=new Function('env','buildPushPayload','fetch','console',compiled+';return sendTaskNotices;')(env,async()=>({method:'POST'}),async()=>{calls++;return {ok,status:ok?201:503}},{warn(){},error(){}});
 const notice={userId:'a',taskId:'summary:today',title:'Summary',body:'Tasks',url:'/?module=warga&tasks=1'};
 await send([notice]);assert.equal(db.prepare('SELECT status FROM staff_task_push_deliveries').get().status,'failed');
 ok=true;await send([notice]);assert.equal(calls,2);assert.equal(db.prepare('SELECT status FROM staff_task_push_deliveries').get().status,'sent');
 await send([notice]);assert.equal(calls,2);
 db.exec("UPDATE staff_task_push_deliveries SET status='sending',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')");
 await send([notice]);assert.equal(calls,2);
 db.exec("UPDATE staff_task_push_deliveries SET updated_at='2020-01-01T00:00:00.000Z'");
 await send([notice]);assert.equal(calls,3);assert.equal(db.prepare('SELECT status FROM staff_task_push_deliveries').get().status,'sent');
 const budget={remaining:1};
 await send([{...notice,taskId:'next-a'},{...notice,taskId:'next-b'}],budget);assert.equal(calls,4);assert.equal(budget.remaining,0);
 await send([{...notice,taskId:'next-a'},{...notice,taskId:'next-b'}],{remaining:1});assert.equal(calls,5);
 db.close();
});
