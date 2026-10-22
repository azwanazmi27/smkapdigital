import type {jsPDF} from 'jspdf';
import {drawOprLetterhead} from './opr-letterhead';
import {reformSections,type ReformForm} from './immediate-reform-model';
export function drawImmediateReform(pdf:jsPDF,form:ReformForm){
 let y=48;
 const page=()=>{drawOprLetterhead(pdf,'E-PEMANTAUAN · IMMEDIATE REFORM');y=48;pdf.setTextColor(22,54,82);};
 const space=(height:number)=>{if(y+height>278){pdf.addPage();page();}};
 const heading=(text:string)=>{space(14);pdf.setFillColor(46,133,176);pdf.roundedRect(12,y,186,8,2,2,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text(text,15,y+5.5);y+=12;pdf.setTextColor(22,54,82);};
 const paragraph=(text:string)=>{pdf.setFont('helvetica','normal');pdf.setFontSize(9);for(const line of pdf.splitTextToSize(text||'-',178) as string[]){space(5);pdf.text(line,16,y);y+=4.3;}y+=2;};
 page();pdf.setProperties({title:'Laporan Pemantauan Pengurusan Immediate Reform',author:form.name});
 pdf.setFont('helvetica','bold');pdf.setFontSize(14);pdf.text('LAPORAN PEMANTAUAN PENGURUSAN',12,y);y+=7;pdf.text('IMMEDIATE REFORM',12,y);y+=9;
 paragraph(`Tarikh: ${form.date}   |   Pemantauan oleh: ${form.name}\nJawatan: ${form.position}`);
 for(const section of reformSections){heading(`${section.id}. ${section.title.toUpperCase()}`);section.items.forEach((text,index)=>{
 const id=`${section.id}${index+1}`,answer=form.answers[id];space(23);
 pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.setTextColor(answer.status==='Tiada'?160:22,answer.status==='Tiada'?45:54,answer.status==='Tiada'?45:82);
 pdf.text(`${id}  |  ${answer.status.toUpperCase()}`,16,y);y+=5;pdf.setTextColor(22,54,82);paragraph(text);paragraph(`Catatan: ${answer.note||'-'}`);
 pdf.setDrawColor(218,230,237);pdf.line(16,y-1,194,y-1);y+=1;
 });}
 heading('ULASAN / TINDAKAN SUSULAN PENTADBIR');paragraph(form.followUp);
 space(28);paragraph(`Pemantauan oleh: ${form.name}\nJawatan: ${form.position}\nTarikh: ${form.date}`);paragraph('Dokumen ini dijana secara digital.');
 for(let i=1;i<=pdf.getNumberOfPages();i++){pdf.setPage(i);pdf.setFillColor(46,133,176);pdf.rect(0,289,210,8,'F');pdf.setTextColor(255,255,255);pdf.setFontSize(7);pdf.text('Portal Rasmi SMK Agama Pahang | Dokumen dijana secara digital',12,294);pdf.text(`${i} / ${pdf.getNumberOfPages()}`,198,294,{align:'right'});}
}
