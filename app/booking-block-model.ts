import type {Booking} from './booking-client';
export type BookingBlock={id:string;roomId:string;weekday:number;startTime:string;endTime:string;effectiveFrom:string;reason:string};
export const bookingWeekdays=['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
const dayMs=86400000;
export function validBookingDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function validBookingTime(value:string){return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);}
// Booking intervals are continuous, including nights between multi-day dates.
// Find the next weekly occurrence in at most seven days, never expand years.
export function blockConflict(block:BookingBlock,booking:Pick<Booking,'startDate'|'endDate'|'startTime'|'endTime'>){
 const start=Date.parse(`${booking.startDate}T${booking.startTime}:00+08:00`),end=Date.parse(`${booking.endDate}T${booking.endTime}:00+08:00`);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 const first=booking.startDate>block.effectiveFrom?booking.startDate:block.effectiveFrom;
 let dateMs=Date.parse(first+'T00:00:00Z');
 dateMs+=((block.weekday-new Date(dateMs).getUTCDay()+7)%7)*dayMs;
 for(let i=0;i<2;i++,dateMs+=7*dayMs){
  const date=new Date(dateMs).toISOString().slice(0,10),a=Date.parse(`${date}T${block.startTime}:00+08:00`),b=Date.parse(`${date}T${block.endTime}:00+08:00`);
  if(a>=end)return null;
  if(start<b&&end>a)return {date,startTime:block.startTime,endTime:block.endTime,reason:block.reason};
 }
 return null;
}
export function blockOccurrences(blocks:BookingBlock[],from:string,to:string,rooms:{id:string;name:string}[]):Booking[]{
 const rows:Booking[]=[];
 for(const block of blocks){
  const room=rooms.find(r=>r.id===block.roomId);if(!room)continue;
  let cursor=Date.parse((from>block.effectiveFrom?from:block.effectiveFrom)+'T00:00:00Z');
  cursor+=((block.weekday-new Date(cursor).getUTCDay()+7)%7)*dayMs;
  const end=Date.parse(to+'T00:00:00Z');
  for(let count=0;cursor<=end&&count<62;cursor+=7*dayMs,count++){
   const date=new Date(cursor).toISOString().slice(0,10);
   rows.push({id:`block:${block.id}:${date}`,room:room.name,applicantName:'Sekatan admin',purpose:block.reason,startDate:date,endDate:date,startTime:block.startTime,endTime:block.endTime,participants:0,status:'Disekat',canDelete:false});
  }
 }
 return rows;
}
