import test from 'node:test';
import assert from 'node:assert/strict';
import {retryLessons,selectRetryNotices,retryableDelivery} from '../app/notification-retry-model.ts';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

test('retry targets one recipient, task and original device only',()=>{
 const notices=[{userId:'a',taskId:'one'},{userId:'b',taskId:'one'},{userId:'a',taskId:'two'}];
 assert.deepEqual(selectRetryNotices(notices,{userId:'a',taskId:'one',subscriptionId:'phone-a'}),[{userId:'a',taskId:'one',subscriptionId:'phone-a'}]);
 assert.deepEqual(selectRetryNotices(notices,{userId:'z',taskId:'one',subscriptionId:'phone-a'}),[]);
});
test('manual class retries only while class has not started in Malaysia',()=>{
 const day={date:'2026-10-07',lessons:[{startTime:'08:00',endTime:'09:00'},{startTime:'09:00',endTime:'10:00'},{start:3,end:4}]};
 assert.deepEqual(retryLessons(day,new Date('2026-10-07T08:00:00+08:00')),[day.lessons[1]]);
 assert.deepEqual(retryLessons(day,new Date('2026-10-08T07:00:00+08:00')),[]);
});
test('successful and active deliveries cannot be manually resent',()=>{
 const now=Date.parse('2026-10-07T00:00:00Z');
 assert.equal(retryableDelivery('sent','2020-01-01',now),false);
 assert.equal(retryableDelivery('failed',new Date(now).toISOString(),now),true);
 assert.equal(retryableDelivery('sending',new Date(now-60000).toISOString(),now),false);
 assert.equal(retryableDelivery('sending',new Date(now-120001).toISOString(),now),true);
});
function retryRunner(row,{attempt=false,final='sent'}={}){
 let calls=[];
 const env={DB:{prepare(sql){return {bind(){return this},async first(){return sql.startsWith('SELECT d.status')?row:{status:final}}}}}};
 const source=readFileSync('app/lib/notification-retry.ts','utf8').replace(/^import .*;\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('export async function','async function');
 const retry=new Function('env','retryableDelivery','malaysiaDay','sendMorningSummaries','sendClassReminders','sendReliefReminders',js+';return retryNotification;')(env,retryableDelivery,()=> '2026-10-07',async(now,budget,manual,target)=>{calls.push(target);if(attempt)budget.remaining--},async()=>{},async()=>{});
 return {retry,calls};
}
const target={userId:'a',taskId:'morning-summary:2026-10-07:a',subscriptionId:'phone-a'};
test('server retry rejects sent records, live attempts and removed subscriptions',async()=>{
 for(const row of [null,{status:'sent',deviceId:'phone-a'}, {status:'sending',updatedAt:new Date().toISOString(),deviceId:'phone-a'}, {status:'failed',deviceId:null}]){
  const {retry,calls}=retryRunner(row);assert.equal((await retry(target)).status,'skipped');assert.equal(calls.length,0);
 }
});
test('retry result distinguishes actual send, provider failure, and stale task',async()=>{
 const row={status:'failed',deviceId:'phone-a'};
 for(const [attempt,final,expected] of [[true,'sent','sent'],[true,'failed','failed'],[false,'sent','skipped']]){
  const {retry,calls}=retryRunner(row,{attempt,final});assert.equal((await retry(target)).status,expected);assert.deepEqual(calls,[target]);
 }
});
