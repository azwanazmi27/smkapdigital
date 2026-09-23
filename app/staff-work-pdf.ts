type DraftAssignment = {name:string;role:string;startDate:string;endDate:string};

const dateLine=/^(\d{2})\.(\d{2})\.(\d{4})$/;
const nameLine=/\b(?:BIN|BINTI|BT)\b|\bB\./i;
const iso=(line:string)=>line.replace(dateLine,'$3-$2-$1');

export function parseDutyScheduleText(pages:string[]):DraftAssignment[] {
  const lines=pages.join('\n').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const assignments:DraftAssignment[]=[];
  for(let i=0;i<lines.length-3;i++){
    if(!dateLine.test(lines[i])||!/^hingga$/i.test(lines[i+1])||!dateLine.test(lines[i+2]))continue;
    const startDate=iso(lines[i]),endDate=iso(lines[i+2]);
    if(endDate<startDate)continue;
    for(let j=i+3;j<lines.length;j++){
      if(dateLine.test(lines[j])&&/^hingga$/i.test(lines[j+1]||''))break;
      if(/^CUTI\b/i.test(lines[j]))break;
      const parts=lines[j].replace(/\bNOR NUR FADHILAH\b/g,'\nNOR NUR FADHILAH').split('\n');
      for(const part of parts){
        const name=part.replace(/\s+/g,' ').replace(/\s+\./g,'.').trim();
        if(nameLine.test(name)&&name.length>=8&&name.length<=120)assignments.push({name,role:'Guru Bertugas',startDate,endDate});
      }
    }
  }
  return assignments;
}
