export type SummarySection={heading:string;body:string};
export const weeklyHeadings=['Gambaran keseluruhan','Hari persekolahan dan cuti','Keselamatan','Kantin','Kebersihan dan keceriaan','Disiplin','Kesihatan','Pemantauan dan pelawat','Aktiviti, isu dan catatan'];
const weekdays=['Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu','Ahad'];
// Format each source record before AI so even the editable draft has day groups.
export function formatDailyNotes(entries:string[]){
 const groups=new Map<string,string[]>();
 for(const entry of entries){
  const match=entry.match(/^(Isnin|Selasa|Rabu|Khamis|Jumaat|Sabtu|Ahad):\s*([\s\S]*)$/i);
  const day=match?weekdays.find(day=>day.toLowerCase()===match[1].toLowerCase())!:'Catatan';
  const notes=(match?match[2]:entry).replace(/([,;:])(?=[A-Za-z])/g,'$1 ').split(/\n+|\s+(?=\d+[.)]\s+[A-Za-z])/).map(note=>note.replace(/^\s*(?:\d+[.)]|[-•])\s+/, '').trim()).filter(Boolean);
  groups.set(day,[...(groups.get(day)||[]),...notes]);
 }
 return [...groups].sort(([a],[b])=>weekdays.indexOf(a)-weekdays.indexOf(b)).map(([day,notes])=>`**${day}**\n${notes.map(note=>`- ${note}`).join('\n')}`).join('\n\n');
}
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
  const numbers=(s:string)=>[...new Set(s.replace(/^\s*\d+[.)]\s+/gm,'').match(/\d+(?:[.,:/-]\d+)*/g)||[])].sort().join('|');
  if(numbers(body)!==numbers(section.body))throw Error('Angka asal telah berubah');
  for(const day of weekdays)if(section.body.includes(`**${day}**`)&&!body.includes(`**${day}**`))throw Error('Kumpulan hari telah berubah');
  return {...section,body:body.trim()};
 });
}
export const serializeSummary=(sections:SummarySection[])=>sections.map((s,i)=>`${i+1}. ${s.heading}\n${s.body}`).join('\n\n');
export type SummaryBlock={kind:'day';label:string;items:string[]}|{kind:'paragraph';text:string};
export function summaryBlocks(body:string):SummaryBlock[]{
 const blocks:SummaryBlock[]=[];let day:Extract<SummaryBlock,{kind:'day'}>|undefined;
 for(const paragraph of body.split(/\n\s*\n/).filter(Boolean)){
  for(const line of paragraph.split('\n').map(s=>s.trim()).filter(Boolean)){
   const label=line.match(/^\*\*(Isnin|Selasa|Rabu|Khamis|Jumaat|Sabtu|Ahad|Catatan):?\*\*\s*:?(.*)$/);
   if(label){day={kind:'day',label:label[1],items:[]};blocks.push(day);if(label[2].trim())day.items.push(label[2].trim());}
   else if(day)day.items.push(line.replace(/^[-•]\s+/,''));
   else blocks.push({kind:'paragraph',text:line});
  }
 }
 return blocks;
}
