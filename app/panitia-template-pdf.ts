import {drawOprLetterhead} from './opr-letterhead';
import {jsPDF} from 'jspdf';
import type {DocumentBlock} from './panitia-templates';
// A4 draft layouts. School letterhead, approved form and Arial font licensing
// must be supplied/verified before declaring an official school format.
export function templatePdf(title:string,subject:string,year:number,blocks:DocumentBlock[]){
 const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});let y=49;
 const clean=(s:string)=>s.replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
 const lineHeight=5.5,bottom=270;
 function font(bold=false){pdf.setTextColor(25,25,25);pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(12);}
 function header(){pdf.setFillColor(255,255,255);pdf.rect(0,0,210,297,'F');drawOprLetterhead(pdf);font();}
 function page(){pdf.addPage();header();y=49;}
 function text(value:string,bold=false){font(bold);const lines=pdf.splitTextToSize(clean(value||''),170) as string[];for(const line of lines){if(y>bottom){page();font(bold);}pdf.text(line,20,y);y+=lineHeight;}y+=3;}
 function table(rows:string[][]){
  const widths=[12,82,20,27,29],labels=['Bil.','Butiran','Kuantiti','Harga (RM)','Jumlah (RM)'];
  const draw=(cells:string[],bold=false,offset=0,count?:number)=>{
   font(bold);const lines=cells.map((c,i)=>pdf.splitTextToSize(clean(c),widths[i]-4) as string[]);
   const n=count??Math.max(...lines.map(a=>a.length)),h=n*lineHeight+4;let x=20;
   for(let i=0;i<widths.length;i++){pdf.setDrawColor(130);pdf.rect(x,y,widths[i],h);const content=offset>0&&i!==1?lines[i]:lines[i].slice(offset,offset+n);pdf.text(content,x+2,y+5);x+=widths[i];}y+=h;
  };
  if(y>245)page();draw(labels,true);
  for(const row of rows){font();const count=Math.max(...row.map((c,i)=>(pdf.splitTextToSize(clean(c),widths[i]-4) as string[]).length));let offset=0;
   if(count*lineHeight+4<=200&&y+count*lineHeight+4>bottom){page();draw(labels,true);}
   while(offset<count){let available=Math.floor((bottom-y-4)/lineHeight);if(available<1){page();draw(labels,true);available=Math.floor((bottom-y-4)/lineHeight);}const n=Math.min(available,count-offset);draw(row,false,offset,n);offset+=n;}
  }y+=6;
 }
 header();text(title.toUpperCase(),true);y+=3;
 const letter=/^Surat /.test(title);
 for(const b of blocks){if(y>bottom-22)page();if(b.table){text(b.heading,true);table(b.table);continue;}
  // Letter paragraphs retain their own numbering; minutes keep topic headings.
  if(!letter||!['Jemputan mesyuarat','Pelantikan','Penutup'].includes(b.heading))text(b.heading,true);
  text(b.body);y+=2;
 }
 for(let p=1;p<=pdf.getNumberOfPages();p++){pdf.setPage(p);pdf.setTextColor(80);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Dijana melalui Portal SMKAP Digital',20,284);pdf.text(`${p} / ${pdf.getNumberOfPages()}`,190,284,{align:'right'});}
 return pdf;
}
