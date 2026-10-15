import {env} from 'cloudflare:workers';
import type {MorningBookingSnapshot} from '../morning-bookings-model';
export async function morningBookingSnapshot(date:string):Promise<MorningBookingSnapshot|null>{
 try{
  const gateway=(env as unknown as {PUSH_SERVICE?:{morningBookings(date:string):Promise<MorningBookingSnapshot>}}).PUSH_SERVICE;
  if(gateway)return await gateway.morningBookings(date);
  const {readMorningBookings}=await import('./morning-bookings-source');
  return await readMorningBookings(date);
 }catch(error){console.error('Morning booking data unavailable',error);return null;}
}
