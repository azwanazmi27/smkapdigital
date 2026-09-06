import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function url(path){let code=readFileSync(new URL(path,import.meta.url),'utf8');code=code.replace(/from '\.\/(management-catalog|skas-catalog)'/g,(_,name)=>'from '+JSON.stringify(url('../app/'+name+'.ts')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');}
const {resolveOprManagement:route,oprSchoolYear}=await import(url('../app/opr-management-routing.ts'));
test('canteen category routes to HEM canteen',()=>assert.equal(route('HEM · Kantin','Mesyuarat kantin').id,'hem-9'));
test('sixth form excellence at canteen stays academic',()=>assert.equal(route('Tingkatan Enam · Subjek Tingkatan Enam · Pengajian Am','Program Kecemerlangan Tingkatan Enam di kantin').id,'enam-2-3'));
test('venue never routes a generic programme into canteen',()=>assert.equal(route('Pengurusan','Majlis di kantin'),null));
test('unknown and ambiguous categories need review',()=>{assert.equal(route('Lain-lain','Pemantauan kantin'),null);assert.equal(route('Kurikulum','Program akademik'),null);});
test('explicit unit routes without title guesses',()=>{assert.equal(route('Kurikulum · Bahasa · Bahasa Melayu','Program di kantin').id,'kurikulum-3-1-1');assert.equal(route('HEM · SPBT','Taklimat').id,'hem-5');});
test('school year comes from programme date or dated filename, not upload time',()=>{assert.equal(oprSchoolYear({programDate:'2027-01-03'},'2026-12-31-old.pdf'),2027);assert.equal(oprSchoolYear({},'2026-08-31-program.pdf'),2026);assert.equal(oprSchoolYear({},'undated.pdf'),null);});
