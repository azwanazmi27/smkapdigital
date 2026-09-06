import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function url(name){let source=readFileSync(new URL('../app/'+name+'.ts',import.meta.url),'utf8');source=source.replace(/from '\.\/([a-z-]+)'/g,(_,dep)=>'from '+JSON.stringify(url(dep)));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');}
const {suggestManagementMaterial:suggest}=await import(url('management-suggestions'));
test('canteen management document receives canteen suggestion without any upload format dependency',()=>{
 const s=suggest({folderId:'hem-9',documentType:'Minit mesyuarat dan tindakan susulan',title:'Mesyuarat kantin'});
 assert.equal(s.standardCode,'3.3');assert.equal(s.unitName,'Kantin dan Pemakanan');assert.match(s.reason,/semak kandungan/);
});
test('document type can propose an achievement standard without moving its source folder',()=>{
 const doc={folderId:'enam-4-1',documentType:'Sijil, keputusan atau pengiktirafan',title:'Johan Negeri'};
 assert.equal(suggest(doc).standardCode,'5.4');assert.equal(doc.folderId,'enam-4-1');
 assert.equal(suggest({...doc,documentType:'Carta organisasi'}).standardCode,'3.2');
});
test('title refines monitoring and unknown folder does not get a guessed mapping',()=>{
 assert.equal(suggest({folderId:'kurikulum-2',documentType:'Pemantauan dan penambahbaikan',title:'Pencerapan PdP di kantin'}).standardCode,'4');
 assert.equal(suggest({folderId:'invalid',documentType:'Carta organisasi',title:'Test'}),null);
 assert.equal(suggest({folderId:'hem-9',documentType:'Pemantauan dan penambahbaikan',title:'Mesyuarat di bilik PdP'}).standardCode,'3.3');
});
