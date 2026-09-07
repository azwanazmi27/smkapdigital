import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';

const root=new URL('..',import.meta.url);
const page=new URL('../public/ekeberadaan-app/assets/page-MSybSbxR.js',import.meta.url);
const source=readFileSync(page,'utf8');
const match=source.match(/pdf\.worker\.min-[A-Za-z0-9_-]+\.mjs/);
test('relief PDF worker referenced by the bundled viewer is published with it',()=>{
 assert.ok(match,'Relief PDF viewer must name its worker asset.');
 const worker=new URL('../public/ekeberadaan-app/assets/'+match[0],import.meta.url);
 assert.ok(existsSync(worker),'Referenced PDF worker asset must exist.');
 assert.ok(statSync(worker).size>100000,'PDF worker must not be an incomplete placeholder.');
});
