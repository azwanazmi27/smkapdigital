import test from 'node:test';
import assert from 'node:assert/strict';
import {jsPDF} from 'jspdf';
import {PDFDocument} from 'pdf-lib';
import {createReliefTablePdf} from '../public/ekeberadaan-app/relief-table-pdf.js';
test('full relief table preserves assignments, cancellations and multipage output',async()=>{
 const rows=Array.from({length:60},(_,i)=>({absentId:String(Math.floor(i/6)),absentTeacher:'GURU ASAL',reliefTeacher:'GURU GANTI',periods:[i%14+1],cancelled:i%7===0,lesson:{subject:'MT',className:'4 AK'}}));
 const before=JSON.stringify(rows),pdf=createReliefTablePdf(jsPDF,'2026-09-29','Selasa','Penyelaras',rows),bytes=pdf.output('arraybuffer');
 assert.equal(JSON.stringify(rows),before);
 const parsed=await PDFDocument.load(bytes);assert.ok(parsed.getPageCount()>1);
 const text=Buffer.from(bytes).toString('latin1');for(const label of ['TIDAK HADIR','WAKTU','SUBJEK','KELAS','GURU GANTI','TANDATANGAN','DIBATALKAN'])assert.ok(text.includes(label),label);
});
