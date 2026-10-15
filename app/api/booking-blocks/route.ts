import {env} from 'cloudflare:workers';
import {portalActor} from '../../server-auth';
import {bookingRooms,lockBookingRoom,unlockBookingRoom} from '../../lib/booking-rooms';
import {bookingBlocks} from '../../lib/booking-controls';
import {blockConflict,validBookingDate,validBookingTime,type BookingBlock} from '../../booking-block-model';
import {bookingDay} from '../../booking-model';
import {callGoogle,normalizeBookings} from '../etempahan/route';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){try{if(!await portalActor(request))return reply({error:'Sila log masuk.'},401);await bookingRooms();return reply({blocks:await bookingBlocks()});}catch{return reply({error:'Sekatan bilik belum dapat dibaca.'},503);}}
async function change(request:Request){let locked:{id:string;token:string}|undefined;
 try{
 const actor=await portalActor(request);if(!actor)return reply({error:'Sila log masuk.'},401);if(!['admin','super_admin'].includes(actor.role))return reply({error:'Hanya admin dan super admin boleh mengurus sekatan.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Permintaan tidak dibenarkan.'},403);
 const input=await request.json() as Record<string,unknown>,rooms=await bookingRooms(),blocks=await bookingBlocks();
 const previous=blocks.find(b=>b.id===input.id),roomId=request.method==='POST'?String(input.roomId||''):previous?.roomId;
 if(!roomId||!rooms.some(r=>r.id===roomId))return reply({error:'Bilik atau sekatan tidak ditemui.'},404);
 const token=await lockBookingRoom(roomId);if(!token)return reply({error:'Bilik sedang dikemas kini. Cuba semula sebentar lagi.'},409);locked={id:roomId,token};
 if(request.method==='DELETE'){
  if(input.confirm!==true)return reply({error:'Sila sahkan pembatalan sekatan.'},400);
  await env.DB.prepare('UPDATE booking_room_blocks SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL').bind(new Date().toISOString(),new Date().toISOString(),previous!.id).run();
 }else{
  const block:BookingBlock={id:previous?.id||crypto.randomUUID(),roomId,weekday:Number(input.weekday),startTime:String(input.startTime||''),endTime:String(input.endTime||''),effectiveFrom:String(input.effectiveFrom||''),reason:String(input.reason||'').trim()};
  if(input.weekday==null||input.weekday===''||!Number.isInteger(block.weekday)||block.weekday<0||block.weekday>6||!validBookingTime(block.startTime)||!validBookingTime(block.endTime)||block.endTime<=block.startTime||!validBookingDate(block.effectiveFrom)||!block.reason||block.reason.length>200)return reply({error:'Lengkapkan hari, masa mula dan tamat dalam hari yang sama, tarikh berkuat kuasa serta tujuan (maksimum 200 aksara).'},400);
  const fresh=await bookingBlocks(roomId);
  if(request.method==='PUT'&&!fresh.some(b=>b.id===block.id))return reply({error:'Sekatan ini telah dibatalkan. Segarkan senarai.'},409);
  if(fresh.some(b=>b.id!==block.id&&b.weekday===block.weekday&&b.startTime<block.endTime&&b.endTime>block.startTime))return reply({error:'Slot ini bertindih dengan sekatan mingguan sedia ada.'},409);
  const room=rooms.find(r=>r.id===roomId)!;
  const rows=normalizeBookings((await callGoogle({action:'etempahan_list_range',from:bookingDay(),to:'9999-12-31'})).bookings);
  const conflicting=rows.filter(r=>r.room===room.sourceName&&r.status!=='Dibatalkan'&&blockConflict(block,r));
  if(conflicting.length)return reply({error:`Sekatan bertindih dengan ${conflicting.length} tempahan sedia ada (${conflicting[0].applicantName}, ${conflicting[0].startDate}). Ubah slot atau batalkan tempahan tersebut dahulu. Tiada tempahan dipadam secara automatik.`},409);
  if(previous)await env.DB.prepare('UPDATE booking_room_blocks SET weekday=?,start_time=?,end_time=?,effective_from=?,reason=?,updated_at=? WHERE id=? AND deleted_at IS NULL').bind(block.weekday,block.startTime,block.endTime,block.effectiveFrom,block.reason,new Date().toISOString(),block.id).run();
  else await env.DB.prepare('INSERT INTO booking_room_blocks(id,room_id,weekday,start_time,end_time,effective_from,reason,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(block.id,roomId,block.weekday,block.startTime,block.endTime,block.effectiveFrom,block.reason,actor.id,new Date().toISOString()).run();
 }
 return reply({success:true});
 }catch(error){console.error('Booking block change',error);return reply({error:'Sekatan belum dapat disimpan. Cuba semula; tetapan lama dikekalkan.'},503);}finally{if(locked)await unlockBookingRoom(locked.id,locked.token).catch(()=>{});}
}
export const POST=change;export const PUT=change;export const DELETE=change;
