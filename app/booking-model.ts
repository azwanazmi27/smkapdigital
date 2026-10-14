import type {Booking} from './booking-client';
export type BookingOwner={email:string;name:string};
export function ownsBooking(row:{ownerEmail?:string;applicantName:string},actor:BookingOwner){
  // A stored account address takes precedence over a coincidentally equal name.
  return row.ownerEmail ? row.ownerEmail.toLowerCase()===actor.email.toLowerCase() : row.applicantName.trim().toLocaleLowerCase('ms-MY')===actor.name.trim().toLocaleLowerCase('ms-MY');
}
export function bookingEnd(row:Pick<Booking,'endDate'|'endTime'>){return Date.parse(`${row.endDate}T${row.endTime}:00+08:00`);}
export function activePersonalBookings<T extends Booking & {ownerEmail?:string}>(rows:T[],actor:BookingOwner,now=Date.now()):T[]{
  return [...new Map(rows.filter(row=>ownsBooking(row,actor)&&row.status!=='Dibatalkan'&&bookingEnd(row)>now).map(row=>[row.id,row])).values()].sort((a,b)=>`${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
}
export const bookingDay=(now=Date.now())=>new Date(now+8*3600000).toISOString().slice(0,10);
