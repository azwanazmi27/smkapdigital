import type {jsPDF} from 'jspdf';
import {summarySections,summaryInline,summaryBlocks,type InlineRun} from './duty-summary';
export function drawWeeklySummary(pdf:jsPDF,text:string,options:{startY:number;newPage:()=>void}){
 const left=16,width=178,bottom=276,lineHeight=5.1;let y=options.startY;
 const linesFor=(paragraph:string,available=width)=>{
  const lines:InlineRun[][]=[[]];let used=0;
  for(const run of summaryInline(paragraph))for(const token of run.text.split(/(\s+)/).filter(Boolean)){
   pdf.setFont('helvetica',run.style);pdf.setFontSize(10);
   const space=/^\s+$/.test(token),value=space?' ':token;
   if(space&&used===0)continue;
   let size=pdf.getTextWidth(value);
   if(used+size>available&&used){lines.push([]);used=0;if(space)continue;}
   if(size>available){for(const char of value){size=pdf.getTextWidth(char);if(used+size>available){lines.push([]);used=0;}lines.at(-1)!.push({text:char,style:run.style});used+=size;}}
   else{lines.at(-1)!.push({text:value,style:run.style});used+=size;}
  }
  return lines;
 };
 const newPage=()=>{options.newPage();y=56;};
 const heading=(label:string)=>{pdf.setTextColor(22,54,82);pdf.setFont('helvetica','bold');pdf.setFontSize(11);const lines=pdf.splitTextToSize(label,width);pdf.text(lines,left,y,{lineHeightFactor:1.4});y+=lines.length*5.5+3;};
 const writeLine=(line:InlineRun[],x:number)=>{pdf.setTextColor(55,75,88);pdf.setFontSize(10);for(const run of line){pdf.setFont('helvetica',run.style);pdf.text(run.text,x,y);x+=pdf.getTextWidth(run.text);}y+=lineHeight;};
 const sections=summarySections(text);
 for(const [index,section] of sections.entries()){
  const title=`${index+1}. ${section.heading}`;
  const blocks=summaryBlocks(section.body).map(block=>({block,rows:block.kind==='day'?block.items.map(item=>linesFor(item,width-5)):[linesFor(block.text)]}));
  const blockHeight=({block,rows}:typeof blocks[number])=>(block.kind==='day'?7:0)+rows.reduce((n,lines)=>n+lines.length*lineHeight+2,0)+3;
  const total=8.5+blocks.reduce((n,b)=>n+blockHeight(b),0)+4;
  // Keep short sections together; larger sections break at day/paragraph boundaries.
  const firstHeight=blocks[0]?blockHeight(blocks[0]):0;
  const firstReserve=index===sections.length-1&&blocks.length===1&&firstHeight<80?38:0;
  const initialHeight=total<=100?total+firstReserve:firstHeight<180?8.5+firstHeight+firstReserve:20;
  if(y+initialHeight>bottom)newPage();
  heading(title);
  for(const [b,entry] of blocks.entries()){
   const {block,rows}=entry,h=blockHeight(entry),last=index===sections.length-1&&b===blocks.length-1;
   const reserve=last&&h<80?38:0;
   if(y+h+reserve>bottom&&h+reserve<=210){newPage();heading(`${title} (sambungan)`);}
   const dayLabel=(continued=false)=>{pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.setTextColor(22,54,82);pdf.text(block.kind==='day'?`${block.label}${continued?' (sambungan)':''}`:'',left,y);y+=7;};
   if(block.kind==='day')dayLabel();
   for(const lines of rows){
    // Avoid separating a bullet from its wrapped lines when the item fits a page.
    if(y+lines.length*lineHeight>bottom&&lines.length*lineHeight<190){newPage();heading(`${title} (sambungan)`);if(block.kind==='day')dayLabel(true);}
    for(const [lineIndex,line] of lines.entries()){
     if(y+lineHeight>bottom){newPage();heading(`${title} (sambungan)`);if(block.kind==='day')dayLabel(true);}
     if(block.kind==='day'&&lineIndex===0){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.setTextColor(55,75,88);pdf.text('•',left,y);}
     writeLine(line,left+(block.kind==='day'?5:0));
    }
    y+=2;
   }
   y+=3;
  }
  y+=4;
 }
 if(y+37>bottom)newPage();return y;
}
