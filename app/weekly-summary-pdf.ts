import type {jsPDF} from 'jspdf';
import {summarySections,summaryInline,type InlineRun} from './duty-summary';
export function drawWeeklySummary(pdf:jsPDF,text:string,options:{startY:number;newPage:()=>void}){
 const left=16,width=178,bottom=276,lineHeight=5.3;let y=options.startY;
 const ensure=(height:number)=>{if(y+height>bottom){options.newPage();y=56;}};
 const linesFor=(paragraph:string)=>{
  const lines:InlineRun[][]=[[]];let used=0;
  for(const run of summaryInline(paragraph))for(const token of run.text.split(/(\s+)/).filter(Boolean)){
   pdf.setFont('helvetica',run.style);pdf.setFontSize(10);
   const space=/^\s+$/.test(token);const value=space?' ':token;
   if(space&&used===0)continue;
   let size=pdf.getTextWidth(value);
   if(used+size>width&&used){lines.push([]);used=0;if(space)continue;}
   if(size>width){for(const char of value){size=pdf.getTextWidth(char);if(used+size>width){lines.push([]);used=0;}lines.at(-1)!.push({text:char,style:run.style});used+=size;}}
   else{lines.at(-1)!.push({text:value,style:run.style});used+=size;}
  }
  return lines;
 };
 const sections=summarySections(text);
 for(const [index,section] of sections.entries()){
  pdf.setFont('helvetica','bold');pdf.setFontSize(11);
  const heading=pdf.splitTextToSize(`${index+1}. ${section.heading}`,width) as string[];
  ensure(heading.length*5.5+13);
  pdf.setTextColor(22,54,82);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text(heading,left,y,{lineHeightFactor:1.4});y+=heading.length*5.5+3;
  const paragraphs=section.body.split(/\n/).filter(Boolean);
  for(const [paragraphIndex,paragraph] of paragraphs.entries()){
   const lines=linesFor(paragraph);
   // Keep the last paragraph with sign-off when both fit on a fresh page.
   if(index===sections.length-1&&paragraphIndex===paragraphs.length-1){const needed=lines.length*lineHeight+44;if(needed<=bottom-56)ensure(needed);}
   for(const line of lines){
    ensure(lineHeight);let x=left;pdf.setTextColor(55,75,88);pdf.setFontSize(10);
    for(const run of line){pdf.setFont('helvetica',run.style);pdf.text(run.text,x,y);x+=pdf.getTextWidth(run.text);}y+=lineHeight;
   }
   y+=3;
  }
  y+=4;
 }
 // Reserve the whole signature block after the last paragraph, never overlay it.
 ensure(37);return y;
}
