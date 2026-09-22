import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileFiles} from '../migration/lib/reconcile-files.mjs';
const file={key:'synthetic/file.pdf',size:12,sha256:'a'.repeat(64)}, target={...file,driveFileId:'test-only'};
test('matching inventories still do not satisfy the production gate',()=>{
 const result=reconcileFiles([file],[target]);assert.equal(result.status,'PASS');assert.equal(result.matched,1);assert.match(result.releaseGate,/NOT SATISFIED/);
});
test('detects missing, unexpected, corrupt and duplicate destination objects',()=>{
 for(const dest of [[],[{...target,key:'wrong'}],[{...target,size:11}],[{...target,sha256:'b'.repeat(64)}],[target,target]]) assert.equal(reconcileFiles([file],dest).status,'FAIL');
});
test('rejects duplicate source keys and Drive ID reuse',()=>{
 assert.equal(reconcileFiles([file,file],[target]).status,'FAIL');
 assert.equal(reconcileFiles([file,{...file,key:'second'}],[target,{...target,key:'second'}]).status,'FAIL');
});
test('missing Drive identity and invalid manifest fail closed',()=>{
 assert.equal(reconcileFiles([file],[file]).status,'FAIL');
 for(const value of [null,{},[{...file,sha256:''}],[{...file,size:-1}]]) assert.throws(()=>reconcileFiles(value,[target]));
});
