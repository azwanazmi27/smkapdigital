import test from 'node:test';
import assert from 'node:assert/strict';
import {createSubmissionLock} from '../app/submission-lock.ts';
test('rapid duplicate submissions perform one write until completion',async()=>{
 const lock=createSubmissionLock();let calls=0,release;
 const pending=new Promise(resolve=>{release=resolve;});
 const first=lock.run(async()=>{calls++;await pending;});
 assert.equal(await lock.run(async()=>{calls++;}),false);assert.equal(calls,1);
 release();assert.equal(await first,true);
 assert.equal(await lock.run(async()=>{calls++;}),true);assert.equal(calls,2);
});
test('failed submission releases lock so user can retry',async()=>{
 const lock=createSubmissionLock();await assert.rejects(lock.run(async()=>{throw new Error('synthetic failure');}),/synthetic failure/);
 assert.equal(await lock.run(async()=>{}),true);
});
