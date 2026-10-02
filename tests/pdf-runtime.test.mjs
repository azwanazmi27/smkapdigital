import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=ts.transpileModule(readFileSync('app/services/pdf-runtime.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function setup(){const scripts=[],window={setTimeout,clearTimeout},context={exports:{},window,document:{createElement:()=>({remove(){this.removed=true;}}),head:{appendChild:s=>scripts.push(s)}},Error,Promise};vm.runInNewContext(source,context);return {scripts,window,load:context.exports.loadJsPdf};}
test('concurrent previews load a single versioned runtime',async()=>{const t=setup(),a=t.load(),b=t.load();assert.equal(a,b);assert.equal(t.scripts.length,1);assert.equal(t.scripts[0].src,'/vendor/jspdf-4.2.1.umd.min.js');const ctor=function(){};t.window.jspdf={jsPDF:ctor};t.scripts[0].onload();assert.equal(await a,ctor);assert.equal(await t.load(),ctor);});
test('failed download can retry without reloading the page',async()=>{const t=setup(),first=t.load();t.scripts[0].onerror();await assert.rejects(first,/Maklumat borang masih dikekalkan/);const next=t.load();assert.equal(t.scripts.length,2);t.window.jspdf={jsPDF:function(){}};t.scripts[1].onload();await next;});
test('retained vendor build generates a PDF',async()=>{const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),pdf=require('../node_modules/jspdf/dist/jspdf.umd.min.js');assert.equal(readFileSync('public/vendor/jspdf-4.2.1.umd.min.js','utf8'),readFileSync('node_modules/jspdf/dist/jspdf.umd.min.js','utf8'));const doc=new pdf.jsPDF();doc.text('OPR Android',10,10);assert.ok(doc.output().startsWith('%PDF-'));});
