import test from 'node:test';
import assert from 'node:assert/strict';
import {isPrimaryReport} from '../app/report-kind.ts';
const record=name=>({name,category:'Kokurikulum · Kelab Kesihatan'});
test('one OPR with four image attachments counts as one report',()=>{
 const records=['2026-09-04-Mysihat__PENYEDIA__FAZIYAH.pdf','2026-09-04-Mysihat-Gambar aktiviti-1.jpg','2026-09-04-Mysihat-Gambar aktiviti-2.jpg','2026-09-04-Mysihat-Gambar aktiviti-3.jpg','2026-09-04-Mysihat-Sijil pencapaian-4.jpg'].map(record);
 assert.equal(records.filter(isPrimaryReport).length,1);assert.equal(records.length,5);
});
test('PDF supporting documents are attachments too',()=>{
 for(const kind of ['Gambar aktiviti','Sijil pencapaian','Keputusan rasmi','Surat pengesahan','Dokumen lain','Sijil  dokumen PDF'])assert.equal(isPrimaryReport(record(`2026-09-04-Tajuk-${kind}-1.pdf`)),false);
 assert.equal(isPrimaryReport(record('2026-09-04-Tajuk__LAMPIRAN__Sijil-1.pdf')),false);
});
test('legacy primary PDFs and named preparers remain visible',()=>{
 for(const name of ['2026-09-04-Tajuk.pdf','2026-09-04-Dokumen lain-1__PENYEDIA__Azwan.pdf'])assert.equal(isPrimaryReport(record(name)),true);
});
test('standalone archive images and monitoring PDFs remain intact',()=>{
 assert.equal(isPrimaryReport({category:'Lain-lain · Arkib Kejayaan',name:'Sijil.jpg'}),true);
 assert.equal(isPrimaryReport({category:'Lain-lain · e-Pemantauan',name:'2026-09-06-E-PEMANTAUAN-Asrama.pdf'}),true);
});
