import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDailyNotes,summaryBlocks,formatWeeklySummary,summarySections,summaryInline,validatePolishedSummary,serializeSummary} from '../app/duty-summary.ts';
import {drawWeeklySummary} from '../app/weekly-summary-pdf.ts';
import {jsPDF} from 'jspdf';
test('numbered structure round-trips every paragraph and safe bold/italic runs',()=>{
 const paragraphs=Array.from({length:9},(_,i)=>`Catatan ${i+1}.\n\nButiran **penting** dan *follow-up*.`),draft=formatWeeklySummary(paragraphs);
 assert.deepEqual(summarySections(draft).map(s=>s.body),paragraphs);
 assert.equal(serializeSummary(summarySections(draft)),draft);
 assert.equal(summarySections(formatWeeklySummary(['Catatan:\n1. Semak pagar\n2. Semak kantin']))[0].body,'Catatan:\n1. Semak pagar\n2. Semak kantin');
 assert.deepEqual(summaryInline('A **tebal** dan *italik* <script>x</script>').map(r=>r.style),['normal','bold','normal','italic','normal']);
});
test('AI cannot omit sections or silently change numerical facts',()=>{
 const source=summarySections(formatWeeklySummary(['Minggu 40, 5 hari.','Isnin, 12 Oktober 2026.']));
 assert.throws(()=>validatePolishedSummary(source,{sections:[{body:'Tidak lengkap'}]}));
 assert.throws(()=>validatePolishedSummary(source,{sections:[{body:'Minggu 41, 5 hari.'},{body:source[1].body}]}));
 assert.throws(()=>validatePolishedSummary(source,{sections:[{body:'Minggu 40, 5 hari. 1.\n2. tajuk lain'},{body:source[1].body}]}));
 assert.equal(validatePolishedSummary(source,{sections:source.map(s=>({body:s.body}))}).length,2);
});
test('long PDF keeps every word above footer and reserves signatures on its final page',()=>{
 const pdf=new jsPDF({unit:'mm'}),texts=[];const write=pdf.text.bind(pdf);
 pdf.text=(value,x,y,...rest)=>{texts.push({value:String(value),y,page:pdf.getNumberOfPages()});return write(value,x,y,...rest)};
 const source=formatWeeklySummary(Array.from({length:9},(_,i)=>Array.from({length:8},(_,j)=>`Rekod${i}butiran${j} **Tindakan:** Guru menyemak laporan murid dengan teliti. *Susulan* akan direkodkan. ${'Kenyataan panjang untuk semakan laporan. '.repeat(3)}`).join('\n\n')));
 const y=drawWeeklySummary(pdf,source,{startY:164,newPage:()=>pdf.addPage()});
 assert.ok(pdf.getNumberOfPages()>2);assert.ok(y+30<=276);
 assert.ok(texts.every(t=>t.y>=56&&t.y<=276));
 const all=texts.map(t=>t.value).join('');for(let i=0;i<9;i++)for(let j=0;j<8;j++)assert.ok(all.includes(`Rekod${i}butiran${j}`));
});

test('day groups preserve all notes and use consistent bullets instead of mixed numbering',()=>{
 const text=formatDailyNotes(['Selasa: 1) Kursus Pengakap\n2) Ujian BM T4','Isnin: PROGRAM ROBOTIK,PROGRAM MATEMATIK TINGKATAN 3','Selasa: IPU tinggi','Khamis: 1. Ujian Tingkatan 4 2. Bengkel Siri 2']);
 const blocks=summaryBlocks(text);
 assert.deepEqual(blocks.map(b=>b.label),['Isnin','Selasa','Khamis']);
 assert.deepEqual(blocks[1].items,['Kursus Pengakap','Ujian BM T4','IPU tinggi']);
 assert.deepEqual(blocks[2].items,['Ujian Tingkatan 4','Bengkel Siri 2']);
 assert.ok(text.includes('ROBOTIK, PROGRAM'));assert.ok(!text.includes('1)'));
 assert.throws(()=>validatePolishedSummary([{heading:'Catatan',body:text}],{sections:[{body:text.replace('**Isnin**','**Jumaat**')}]}));
});
test('PDF keeps a short section together and labels any long continuation',()=>{
 const pdf=new jsPDF({unit:'mm'}),marks=[];const write=pdf.text.bind(pdf);
 pdf.text=(value,x,y,...rest)=>{marks.push({value:String(value),page:pdf.getNumberOfPages()});return write(value,x,y,...rest)};
 drawWeeklySummary(pdf,formatWeeklySummary([formatDailyNotes(['Isnin: Satu catatan ringkas.'])]),{startY:263,newPage:()=>pdf.addPage()});
 assert.equal(marks.find(m=>m.value.includes('Gambaran')).page,2);
 assert.equal(marks.find(m=>m.value==='Isnin').page,2);
 const long=formatWeeklySummary([formatDailyNotes(Array.from({length:60},(_,i)=>`Isnin: Nota${i} butiran tindakan susulan yang direkodkan.`))]);
 drawWeeklySummary(pdf,long,{startY:164,newPage:()=>pdf.addPage()});
 assert.ok(marks.some(m=>m.value.includes('(sambungan)')));
 for(let i=0;i<60;i++)assert.ok(marks.some(m=>m.value===`Nota${i}`));
});
