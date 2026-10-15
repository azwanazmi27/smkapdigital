import {ownsBooking,bookingEnd} from './booking-model';
import type {Booking} from './booking-client';
export type MorningBooking=Booking & {ownerEmail?:string};
export type MorningBookingSnapshot={bookings:MorningBooking[];rooms:{id:string;sourceName:string;name:string;deletedAt:string|null}[];coordinators:{roomId:string;userId:string}[]};
export function personalMorningBookings(snapshot:MorningBookingSnapshot,actor:{id:string;name:string;email:string},today:string,now:number){
 const todayRows=[...new Map(snapshot.bookings.filter(b=>b.status!=='Dibatalkan'&&b.startDate<=today&&b.endDate>=today&&bookingEnd(b)>now).map(b=>[b.id,b])).values()].sort((a,b)=>`${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
 const rooms=new Set(snapshot.rooms.filter(r=>!r.deletedAt&&snapshot.coordinators.some(c=>c.roomId===r.id&&c.userId===actor.id)).map(r=>r.sourceName));
 const present=(b:MorningBooking)=>({...b,room:snapshot.rooms.find(r=>r.sourceName===b.room)?.name||b.room});
 return {own:todayRows.filter(b=>ownsBooking(b,actor)).map(present),supervised:todayRows.filter(b=>rooms.has(b.room)).map(present)};
}
const short=(text:string,max:number)=>text.length>max?text.slice(0,max-1)+'…':text;
const date=(d:string)=>`${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`;
export function morningBookingsBody(bookings:ReturnType<typeof personalMorningBookings>|null){
 if(!bookings)return 'Tempahan Saya : Status belum dapat disahkan\nBilik Seliaan Saya : Status belum dapat disahkan';
 const section=(title:string,rows:MorningBooking[],supervised=false)=>`${title} : ${rows.length} tempahan`+rows.slice(0,2).map(b=>`\n• ${short(b.room,60)}${supervised?` · ${short(b.applicantName,70)}`:''}\n  ${b.startDate===b.endDate?`${date(b.startDate)}, ${b.startTime}–${b.endTime}`:`${date(b.startDate)}, ${b.startTime} hingga ${date(b.endDate)}, ${b.endTime}`}`).join('')+(rows.length>2?`\n  +${rows.length-2} lagi — lihat Tugasan Saya`:'');
 return section('Tempahan Saya',bookings.own)+'\n'+section('Bilik Seliaan Saya',bookings.supervised,true);
}
