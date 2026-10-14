import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Execute the actual archive preview branch, including access checks. The
// previous undefined admin flag only failed after selecting a certificate.
const source=readFileSync('app/landing.tsx','utf8');
const ast=ts.createSourceFile('landing.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const archive=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='AchievementArchive');
const code=ts.transpileModule(archive.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
const report={id:'certificate_test_123',category:'Arkib Kejayaan',name:'2026-10-14-ARKIB-Sijil Contoh__TEMPAT__Dewan__PERINGKAT__Sekolah__BIDANG__Akademik__PENCAPAIAN__Penyertaan__PENYEDIA__Guru Contoh.pdf',updatedAt:'2026-10-14T09:00:00Z'};
function preview(role){
 let state=0;
 const useState=initial=>{const index=state++;return [index===6?report:index===7?(role?{role}:null):typeof initial==='function'?initial():initial,()=>{}];};
 const Component=new Function('React','useState','useEffect','oprMemoryCache','achievementCategory','DrivePdfPreview',`${code};return AchievementArchive;`)(React,useState,()=>{},[report],'Arkib Kejayaan',({fileId,title})=>React.createElement('iframe',{src:`/api/drive?file=${fileId}`,title}));
 return renderToStaticMarkup(React.createElement(Component,{notify(){}}));
}
for(const role of [null,'teacher','admin','super_admin'])test(`uploaded certificate opens for ${role||'pending identity'} without crashing`,()=>{
 const html=preview(role);
 assert.match(html,/Sijil Contoh/);
 assert.match(html,/src="\/api\/drive\?file=certificate_test_123"/);
 assert.match(html,/Tutup pratonton/);
 assert.equal(html.includes('Padam laporan'),role==='admin'||role==='super_admin');
 assert.equal(html.includes('Muat turun semua Arkib'),role==='admin'||role==='super_admin');
});
