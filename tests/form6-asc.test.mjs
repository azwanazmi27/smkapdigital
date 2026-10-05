import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{parseForm6AscPage,extractForm6Asc}from'../public/ekeberadaan-app/form6-asc.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/form6-asc-grid.json',import.meta.url),'utf8'));
const parse=()=>parseForm6AscPage(fixture.items,fixture.height,fixture.operators,fixture.OPS);
test('13-period aSc parses merged lessons by vector boundaries and rejoins wrapped classes',()=>{const teacher=parse();assert.equal(teacher.name,'TEST TEACHER');assert.equal(teacher.lessons.length,11);assert.deepEqual(teacher.lessons.find(l=>l.day==='Isnin'&&l.start===3),{day:'Isnin',start:3,end:4,subject:'SEJ 1',className:'6 SAYUTI'});assert.equal(teacher.lessons.find(l=>l.day==='Isnin'&&l.start===1).className,'6 ZAHABI/6 NAWAWI/6 SAYUTI/6 SUFI');assert.equal(teacher.lessons.find(l=>l.day==='Rabu'&&l.start===12).end,13);assert.ok(teacher.lessons.every(l=>l.subject!=='REHAT'));});
const document=(bad=0)=>({numPages:11,async getPage(n){return {view:[0,0,842,fixture.height],async getTextContent(){return {items:n===bad?[]:fixture.items};},async getOperatorList(){return fixture.operators;},cleanup(){}};}});
test('every page is read, including the last teacher',async()=>{const result=await extractForm6Asc(document(),fixture.OPS);assert.equal(result.pageCount,11);assert.equal(result.teachers.length,11);});
test('one invalid page prevents a silently partial import',async()=>{await assert.rejects(extractForm6Asc(document(10),fixture.OPS),/Halaman 10/);});
