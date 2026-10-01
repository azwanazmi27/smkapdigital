export const malaysiaDate=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function absenceLate(record){
 if(record.reason==='MC'||/kecemasan/i.test(record.reason))return false;
 const timestamp=new Date(record.createdAt).getTime();
 // Existing deadline: 6 pm Malaysia on the day before the absence.
 const dayStart=Date.parse(`${record.absenceDate}T00:00:00+08:00`);
 return Number.isFinite(timestamp)&&Number.isFinite(dayStart)&&timestamp>=dayStart-6*60*60*1000;
}
export function absenceOnDate(record,date){return record.absenceDate<=date&&(record.endDate||record.absenceDate)>=date;}
export function absencePeople(records,date,category){return new Set(records.filter(row=>absenceOnDate(row,date)&&(!category||row.category===category)).map(row=>row.teacherId||row.teacherName.trim().toUpperCase())).size;}
