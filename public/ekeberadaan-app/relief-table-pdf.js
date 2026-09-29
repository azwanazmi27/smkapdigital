// Shared by the relief editor and task PDF endpoint. No browser/session data.
export function createReliefTablePdf(Pdf, date, day, coordinator, assignments) {
 const pdf=new Pdf({orientation:'portrait',unit:'mm',format:'a4'});
 const times=['7:40 - 8:10','8:10 - 8:40','8:40 - 9:10','9:10 - 9:40','9:40 - 10:10','10:10 - 10:40','10:40 - 11:10','11:10 - 11:40','11:40 - 12:10','12:10 - 12:40','12:40 - 1:10','1:10 - 1:40','1:40 - 2:10','2:10 - 2:40','2:40 - 3:00','3:00 - 3:30','3:30 - 4:00','4:00 - 4:30','4:30 - 5:00'];
 const groups=new Map();
 for(const item of assignments){const key=item.absentId||item.absentTeacher||'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
 const x=[12,44,60,73,95,171,198];
 let y=0;
 function header(first){
  pdf.setTextColor(0);pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.text('Penggantian',105,16,{align:'center'});
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);
  const formatted=new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(date+'T12:00:00Z'));
  pdf.text(`${day} · ${formatted}`,105,23,{align:'center'});y=29;
  if(first){pdf.setFont('helvetica','bold');pdf.setFontSize(7);const names=pdf.splitTextToSize('GURU TIDAK HADIR: '+[...groups.values()].map(rows=>rows[0].absentTeacher||'').join(', '),184);pdf.text(names,105,y,{align:'center'});y+=names.length*3.3+5;}
  pdf.setFontSize(7);pdf.setFont('helvetica','bold');['TIDAK HADIR','WAKTU','SUBJEK','KELAS','GURU GANTI','TANDATANGAN'].forEach((label,i)=>pdf.text(label,x[i]+1,y));y+=3;pdf.setDrawColor(0);pdf.setLineWidth(.3);pdf.line(12,y,198,y);
 }
 header(true);
 for(const group of groups.values()){
  const rows=group.flatMap(item=>(item.periods?.length?item.periods:['']).map(period=>({...item,period}))).sort((a,b)=>Number(a.period)-Number(b.period));
  let segmentStart=y, segmentName=rows[0]?.absentTeacher||'';
  const drawName=()=>{pdf.setFont('helvetica','bold');pdf.setFontSize(8);const lines=pdf.splitTextToSize(segmentName,29);pdf.text(lines,28,segmentStart+(y-segmentStart)/2-(lines.length-1)*1.6,{align:'center'});};
  for(const row of rows){
   pdf.setFont('helvetica','bold');pdf.setFontSize(8);
   const replacement=row.cancelled||row.reliefId==='__DIBATALKAN__'?'DIBATALKAN':row.reliefTeacher||'BELUM DIISI';
   const names=pdf.splitTextToSize(replacement,73);
   const subject=pdf.splitTextToSize(row.lesson?.subject||'',12),klass=pdf.splitTextToSize(row.lesson?.className||'',20);
   const height=Math.max(12,names.length*3.6+5,subject.length*3.6+5,klass.length*3.6+5);
   if(y+height>278){drawName();pdf.addPage();header(false);segmentStart=y;}
   if(row.cancelled||row.reliefId==='__DIBATALKAN__'){pdf.setFillColor(241,242,240);pdf.rect(44,y,154,height,'F');}
   pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text(String(row.period),45,y+4.5);pdf.text(names,96,y+4.5);
   pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.text(subject,61,y+4.5);pdf.text(klass,74,y+4.5);
   pdf.setFontSize(6);pdf.text(times[Number(row.period)-1]||'',45,y+9);
   y+=height;pdf.setDrawColor(100);pdf.setLineWidth(.15);pdf.line(44,y,198,y);
  }
  drawName();pdf.setDrawColor(0);pdf.setLineWidth(.3);pdf.line(12,y,198,y);
 }
 const pages=pdf.getNumberOfPages();for(let page=1;page<=pages;page++){pdf.setPage(page);pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(90);pdf.text('SMK Agama Pahang',12,288);pdf.text(`${page} / ${pages}`,198,288,{align:'right'});}
 pdf.setProperties({title:`Relief ${date} - SMK Agama Pahang`,author:coordinator||'SMK Agama Pahang'});return pdf;
}
