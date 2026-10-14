export type SummarySection={heading:string;body:string};
export const weeklyHeadings=['Gambaran keseluruhan','Hari persekolahan dan cuti','Keselamatan','Kantin','Kebersihan dan keceriaan','Disiplin','Kesihatan','Pemantauan dan pelawat','Aktiviti, isu dan catatan'];
export function formatWeeklySummary(paragraphs:string[]){return paragraphs.map((body,i)=>`${i+1}. ${weeklyHeadings[i]||'Catatan tambahan'}\n${body.trim()}`).join('\n\n');}
export function summarySections(text:string):SummarySection[]{
 const sections:SummarySection[]=[];
 for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
  const heading=line.match(/^\s*\d+\.\s+(.+)$/);
  const title=heading?.[1].replace(/\*\*/g,'').trim();
  if(title&&[...weeklyHeadings,'Catatan tambahan'].includes(title))sections.push({heading:title,body:''});
  else {if(!sections.length)sections.push({heading:'Rumusan mingguan',body:''});sections[sections.length-1].body+=line+'\n';}
 }
 return sections.map(s=>({...s,body:s.body.trim()})).filter(s=>s.body||s.heading);
}
export type InlineRun={text:string;style:'normal'|'bold'|'italic'};
export function summaryInline(text:string):InlineRun[]{
 // A small, safe formatting subset. HTML is always plain text, never executed.
 return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map(part=>part.startsWith('**')&&part.endsWith('**')?{text:part.slice(2,-2),style:'bold'}:part.startsWith('*')&&part.endsWith('*')?{text:part.slice(1,-1),style:'italic'}:{text:part,style:'normal'});
}
export function validatePolishedSummary(source:SummarySection[],value:unknown){
 const result=value as {sections?:{body?:unknown}[]};
 if(!Array.isArray(result?.sections)||result.sections.length!==source.length)throw Error('Bahagian rumusan tidak lengkap');
 return source.map((section,i)=>{
  const body=result.sections![i]?.body;
  if(typeof body!=='string'||!body.trim()||body.length>12000||/^\s*\d+\.\s/m.test(body))throw Error('Format rumusan tidak sah');
  // A writing assistant cannot silently add/remove numerical facts.
  const numbers=(s:string)=>[...new Set(s.match(/\d+(?:[.,:/-]\d+)*/g)||[])].sort().join('|');
  if(numbers(body)!==numbers(section.body))throw Error('Angka asal telah berubah');
  return {...section,body:body.trim()};
 });
}
export const serializeSummary=(sections:SummarySection[])=>sections.map((s,i)=>`${i+1}. ${s.heading}\n${s.body}`).join('\n\n');
