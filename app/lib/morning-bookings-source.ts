import {callGoogle,normalizeBookings} from './booking-source';
import {bookingRooms} from './booking-rooms';
import {roomCoordinators} from './booking-controls';
import {validBookingDate} from '../booking-block-model';
import {readBookingStatus} from '../etempahan-cache';
import type {MorningBookingSnapshot} from '../morning-bookings-model';
// One shared source read for all recipients, never one Google request per teacher.
export async function readMorningBookings(date:string):Promise<MorningBookingSnapshot>{
 if(!validBookingDate(date))throw new Error('Tarikh ringkasan tempahan tidak sah.');
 const [source,rooms,coordinators]=await Promise.all([
  readBookingStatus('https://portal.smkapdigital.workers.dev',date,async()=>normalizeBookings((await callGoogle({action:'etempahan_list',date})).bookings)),
  bookingRooms(true),roomCoordinators()
 ]);
 return {bookings:source.value,rooms,coordinators};
}
