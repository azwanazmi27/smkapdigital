import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jsPDF} from 'jspdf';
import {freshReform,reformItems,reformNotes,malaysiaDate} from '../app/immediate-reform-model.ts';
import {drawImmediateReform} from '../app/immediate-reform-pdf.ts';
test('14 original items default to Ada with optional empty notes',()=>{const form=freshReform();assert.equal(reformItems.length,14);assert.ok(Object.values(form.answers).every(a=>a.status==='Ada'&&a.note===''));assert.ok(reformNotes(form).includes('Warden berada di asrama'));});
test('Malaysia date crosses UTC boundary correctly',()=>assert.equal(malaysiaDate(new Date('2026-10-21T17:00:00Z')),'2026-10-22'));
test('notes preserved for both choices; long notes paginate without clipping',()=>{const form=freshReform('Pemantau Ujian','Guru');form.answers.A1.note='Catatan untuk Ada';form.answers.A2={status:'Tiada',note:'Perlu dikunci'};assert.match(reformNotes(form),/Ada \| Catatan: Catatan untuk Ada/);assert.match(reformNotes(form),/Tiada \| Catatan: Perlu dikunci/);const pdf=new jsPDF();form.followUp=('Tindakan susulan panjang untuk pengesahan. ').repeat(95)+'PENANDA AKHIR';drawImmediateReform(pdf,form);assert.ok(pdf.getNumberOfPages()>1);assert.ok(pdf.output().includes('PENANDA AKHIR'));});
