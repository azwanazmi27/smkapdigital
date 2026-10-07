// School schedules use present-day Malaysia time (UTC+08:00, no daylight saving).
// Avoid constructing an Intl formatter once per teacher in minute-by-minute jobs.
const days=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
export function malaysiaClock(now=new Date()){
 const local=new Date(now.getTime()+8*60*60*1000);
 return {date:local.toISOString().slice(0,10),day:days[local.getUTCDay()],weekday:local.getUTCDay(),hour:local.getUTCHours(),minute:local.getUTCMinutes(),time:local.toISOString().slice(11,16)};
}
