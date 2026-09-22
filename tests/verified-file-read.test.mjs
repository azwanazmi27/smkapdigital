import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readMigratingFile } from '../migration/lib/verified-file-read.mjs';
const bytes = new TextEncoder().encode('synthetic migration file');
const mapping = {key:'private/test.pdf',status:'verified',driveFileId:'synthetic-id',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
function deps(overrides={}) { return {findMapping:async()=>mapping,readDrive:async()=>({bytes,mimeType:'application/pdf'}),readLegacy:async()=>{throw new Error('Unexpected legacy access');},...overrides}; }
test('verified bytes returned through stable logical key',async()=>{
 const result=await readMigratingFile(mapping.key,deps()); assert.deepEqual(result.bytes,bytes);assert.equal(result.source,'drive');assert.equal(result.logicalKey,mapping.key);
});
test('unmapped and pending files retain original source',async()=>{
 for(const value of [null,{...mapping,status:'copying'}]) {
  const result=await readMigratingFile(mapping.key,deps({findMapping:async()=>value,readDrive:async()=>{throw new Error('Must not read unverified copy');},readLegacy:async key=>({key,source:'legacy'})}));
  assert.equal(result.key,mapping.key);assert.equal(result.source,'legacy');
 }
});
test('corruption and truncation reject without legacy fallback',async()=>{
 for(const wrong of [new Uint8Array(bytes.length),bytes.slice(1)]) await assert.rejects(readMigratingFile(mapping.key,deps({readDrive:async()=>({bytes:wrong})})),/integrity mismatch/);
});
test('missing verified file and Drive outage remain visible',async()=>{
 await assert.rejects(readMigratingFile(mapping.key,deps({readDrive:async()=>null})),/unavailable/);
 await assert.rejects(readMigratingFile(mapping.key,deps({readDrive:async()=>{throw new Error('Drive unavailable');}})),/Drive unavailable/);
});
test('wrong-key, missing checksum and invalid size cannot become verified reads',async()=>{
 for(const changes of [{key:'another/key'},{sha256:''},{size:-1},{size:1.1},{driveFileId:''}]) await assert.rejects(readMigratingFile(mapping.key,deps({findMapping:async()=>({...mapping,...changes})})),/Invalid verified/);
});
