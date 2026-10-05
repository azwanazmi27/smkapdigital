import {ascGrid} from './asc-grid.js';
const days=['Isnin','Selasa','Rabu','Khamis','Jumaat'];
export function parseForm6AscPage(items,height,operators,OPS){
 const title=items.find(i=>/^Guru\s+\S/i.test(i.str));
 if(!title)throw Error('Nama guru pada kepala halaman tidak ditemui.');
 const mo=items.find(i=>i.str==='Mo');
 const headers=items.filter(i=>/^\d+$/.test(i.str)&&mo&&i.transform[5]>mo.transform[5]&&i.transform[4]>mo.transform[4]);
 const first=headers.find(i=>i.str==='1');
 const count=headers.filter(i=>first&&Math.abs(i.transform[5]-first.transform[5])<3).length;
 if(count<2||count>30)throw Error('Nombor waktu tidak dapat disahkan.');
 const grid=ascGrid(items,height,operators,OPS,count),lessons=[];
 for(let day=0;day<grid.length;day++)for(const [start,parts] of grid[day].cells){
  const values=parts.map(i=>i.str.trim()).filter(Boolean);if(values.every(s=>s==='REHAT'))continue;
  // aSc emits class fragments first and the subject last within each cell.
  const subject=values.at(-1),classParts=values.slice(0,-1);
  if(!subject||/^6\b/.test(subject)||!classParts.length||!/^6\b/.test(classParts[0]))throw Error(`${days[day]} W${start}: sel tidak dapat dipisahkan kepada subjek dan kelas.`);
  const className=classParts.join(' ').replace(/\s*\/\s*/g,'/').replace(/\s+(?=6\b)/g,'/').split('/').map(part=>part.trim().replace(/^6\s+(.+)$/,(_,name)=>'6 '+name.replace(/\s+/g,''))).join('/');
  const end=Math.min(...[...grid[day].boundaries].filter(edge=>edge>=start));
  if(!Number.isFinite(end))throw Error('Sempadan sel tidak dapat disahkan.');
  lessons.push({day:days[day],start,end,subject,className});
 }
 return {name:title.str.replace(/^Guru\s+/i,'').trim(),userId:'',lessons:lessons.sort((a,b)=>days.indexOf(a.day)-days.indexOf(b.day)||a.start-b.start)};
}
export async function extractForm6Asc(document,OPS){
 const teachers=[],failures=[];
 if(document.numPages>200)throw Error('PDF melebihi 200 halaman. Bahagikan fail.');
 for(let number=1;number<=document.numPages;number++){
  const page=await document.getPage(number);
  try{const text=await page.getTextContent(),operators=await page.getOperatorList();teachers.push(parseForm6AscPage(text.items.filter(i=>'str'in i),page.view[3],operators,OPS));}
  catch(error){failures.push(`Halaman ${number}: ${error.message}`);}
  finally{page.cleanup();}
 }
 if(failures.length)throw Error(`Jadual belum diimport kerana ${failures.length}/${document.numPages} halaman perlu disemak. ${failures.join(' · ')}`);
 if(teachers.length!==document.numPages)throw Error('Bilangan guru tidak sepadan dengan bilangan halaman.');
 return {teachers,pageCount:document.numPages};
}
