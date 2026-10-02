/** School week numbers may be reused on older records; group by actual calendar dates. */
export function dutyMonday(value:string) {
  const date=new Date(`${value}T12:00:00Z`);
  if(Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate()-(date.getUTCDay()||7)+1);
  return date.toISOString().slice(0,10);
}
export function dutyPeriods(records:{reportDate:string}[]) {
  return [...new Set(records.map(record=>dutyMonday(record.reportDate)).filter(Boolean))].sort().reverse();
}
export function dutyDates(monday:string) {
  return Array.from({length:5},(_,index)=>{
    const date=new Date(`${monday}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate()+index);
    return date.toISOString().slice(0,10);
  });
}
