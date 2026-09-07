import { jsPDF } from 'jspdf';

export type AbsenceSummaryRow = { teacherName:string; absenceDate:string; endDate:string|null; reason:string };
export function malaysiaClock(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 3600000).toISOString();
  return { date:local.slice(0,10), time:local.slice(11,16) };
}
const dateLabel = (date:string) => new Date(date+'T12:00:00+08:00').toLocaleDateString('ms-MY',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'});
export function buildAbsenceSummaryPdf(date:string, rows:AbsenceSummaryRow[]) {
  const pdf = new jsPDF({unit:'mm',format:'a4',compress:true});
  const widths=[12,67,47,52],left=16,bottom=276;
  let y=0;
  const heading=()=>{
    pdf.setFont('helvetica','bold');pdf.setFontSize(14);pdf.setTextColor(18,63,100);
    pdf.text('RUMUSAN KEBERADAAN GURU',105,22,{align:'center'});
    pdf.text('SMK AGAMA PAHANG',105,29,{align:'center'});
    pdf.setDrawColor(18,63,100);pdf.line(left,34,194,34);
    pdf.setFont('helvetica','normal');pdf.setFontSize(11);pdf.setTextColor(20,30,40);
    pdf.text('Tarikh: '+dateLabel(date),105,43,{align:'center'});
    y=51;let x=left;
    ['Bil.','Nama guru','Tarikh bercuti','Sebab'].forEach((label,i)=>{
      pdf.setFillColor(18,63,100);pdf.rect(x,y,widths[i],10,'F');
      pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.text(label,x+2,y+6.5);x+=widths[i];
    });y+=10;pdf.setTextColor(20,30,40);pdf.setFont('helvetica','normal');pdf.setFontSize(10);
  };
  heading();
  if(!rows.length){pdf.text('Tiada ketidakhadiran direkodkan.',105,y+10,{align:'center'});}
  rows.forEach((row,index)=>{
    const range=dateLabel(row.absenceDate)+(row.endDate&&row.endDate!==row.absenceDate?' - '+dateLabel(row.endDate):'');
    const cells=[String(index+1),row.teacherName,range,row.reason||'-'].map((value,i)=>pdf.splitTextToSize(value,widths[i]-4) as string[]);
    let offset=0;const total=Math.max(...cells.map(lines=>lines.length));
    while(offset<total){
      if(bottom-y<12){pdf.addPage();heading();}
      const count=Math.min(total-offset,Math.floor((bottom-y-6)/4.6));
      const height=count*4.6+6;let x=left;
      cells.forEach((lines,i)=>{pdf.setDrawColor(100,115,125);pdf.rect(x,y,widths[i],height);const part=lines.slice(offset,offset+count);if(part.length)pdf.text(part,x+2,y+6,{lineHeightFactor:1.3});x+=widths[i];});
      y+=height;offset+=count;
    }
  });
  const pages=pdf.getNumberOfPages();
  for(let page=1;page<=pages;page++){pdf.setPage(page);pdf.setFontSize(8);pdf.setTextColor(85,98,110);pdf.text('Dijana daripada Portal SMKAP Digital',16,288);pdf.text(`${page} / ${pages}`,194,288,{align:'right'});}
  return pdf.output('arraybuffer');
}
