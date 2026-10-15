import {roomCoordinators,ensureBookingControls} from '../../lib/booking-controls';
import {env} from 'cloudflare:workers';
import {portalActor} from '../../server-auth';
import {bookingRooms,lockBookingRoom,unlockBookingRoom} from '../../lib/booking-rooms';
import {callGoogle,normalizeBookings} from '../etempahan/route';
import {bookingDay,bookingEnd} from '../../booking-model';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){try{
 const actor=await portalActor(request);if(!actor)return reply({error:'Sila log masuk.'},401);
 const rooms=await bookingRooms(),coordinators=await roomCoordinators();
 const manage=new URL(request.url).searchParams.get('manage')==='1';
 if(manage&&!['admin','super_admin'].includes(actor.role))return reply({error:'Akses admin diperlukan.'},403);
 const users=manage?(await env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL ORDER BY name").all()).results:undefined;
 return reply({rooms:rooms.map(({id,name,description})=>{const c=coordinators.find(c=>c.roomId===id);return {id,name,description,coordinatorId:c?.userId||'',coordinatorName:c?.name||''};}),...(users?{users}:{})});
}catch{return reply({error:'Senarai bilik tidak dapat dibaca. Sila cuba semula.'},503);}}

async function change(request:Request){let locked:{id:string;token:string}|undefined;try{
 const actor=await portalActor(request);if(!actor)return reply({error:'Sila log masuk.'},401);if(!['admin','super_admin'].includes(actor.role))return reply({error:'Hanya admin boleh mengurus bilik.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Permintaan tidak dibenarkan.'},403);
 await ensureBookingControls();
 const body=await request.json() as Record<string,unknown>,catalog=await bookingRooms(true),id=typeof body.id==='string'?body.id:'';
 if(request.method==='DELETE'){
  if(body.confirm!==true)return reply({error:'Sila sahkan pemadaman bilik.'},400);
  const room=catalog.find(r=>r.id===id&&!r.deletedAt);if(!room)return reply({error:'Bilik tidak ditemui.'},404);
  const token=await lockBookingRoom(id);if(!token)return reply({error:'Bilik sedang digunakan untuk tempahan. Cuba semula sebentar lagi.'},409);locked={id,token};
  // Live read: never make deletion decisions from the status cache.
  const rows=normalizeBookings((await callGoogle({action:'etempahan_list_range',from:bookingDay(),to:'9999-12-31'})).bookings);
  if(rows.some(row=>row.room===room.sourceName&&row.status!=='Dibatalkan'&&bookingEnd(row)>Date.now()))return reply({error:'Bilik masih mempunyai tempahan belum tamat. Selesaikan tempahan tersebut sebelum memadam bilik.'},409);
  await env.DB.prepare('UPDATE booking_rooms SET deleted_at=?,updated_at=? WHERE id=?').bind(new Date().toISOString(),new Date().toISOString(),id).run();
 }else{
  const currentCoordinator=(await roomCoordinators()).find(c=>c.roomId===id);
  const coordinatorId=typeof body.coordinatorId==='string'?body.coordinatorId:currentCoordinator?.userId||'';
  if(coordinatorId&&!await env.DB.prepare("SELECT id FROM portal_users WHERE id=? AND status='active' AND deleted_at IS NULL").bind(coordinatorId).first())return reply({error:'Pilih penyelaras daripada pengguna portal yang aktif.'},400);
  const name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):'',description=typeof body.description==='string'?body.description.trim():'';
  if(!name||name.length>100||description.length>300)return reply({error:'Masukkan nama bilik (maksimum 100 aksara) dan maklumat ringkas (300 aksara).'},400);
  if(catalog.some(r=>r.id!==id&&r.name.toLowerCase()===name.toLowerCase()))return reply({error:'Nama bilik ini sudah wujud atau telah diarkibkan. Gunakan nama lain.'},409);
  const savedId=request.method==='PUT'?id:crypto.randomUUID();
  const writes:D1PreparedStatement[]=[];
  if(request.method==='PUT'){
   if(!catalog.some(r=>r.id===id&&!r.deletedAt))return reply({error:'Bilik tidak ditemui.'},404);
   const token=await lockBookingRoom(id);if(!token)return reply({error:'Bilik sedang dikemas kini. Cuba semula.'},409);locked={id,token};
   writes.push(env.DB.prepare('UPDATE booking_rooms SET name=?,description=?,updated_at=? WHERE id=? AND deleted_at IS NULL').bind(name,description,new Date().toISOString(),id));
  }else{
   // source_name is immutable; renaming never bypasses existing clash checks.
   if(catalog.some(r=>r.sourceName.toLowerCase()===name.toLowerCase()))return reply({error:'Nama ini pernah digunakan. Sila gunakan nama lain.'},409);
   writes.push(env.DB.prepare('INSERT INTO booking_rooms(id,source_name,name,description,updated_at) VALUES(?,?,?,?,?)').bind(savedId,name,name,description,new Date().toISOString()));
  }
  if(coordinatorId)writes.push(env.DB.prepare('INSERT INTO booking_room_coordinators(room_id,user_id,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(room_id) DO UPDATE SET user_id=excluded.user_id,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(savedId,coordinatorId,new Date().toISOString(),actor.id));
  else writes.push(env.DB.prepare('DELETE FROM booking_room_coordinators WHERE room_id=?').bind(savedId));
  await env.DB.batch(writes);
 }
 return reply({success:true});
}catch(error){console.error('Booking room settings',error);return reply({error:'Perubahan bilik tidak dapat disahkan. Cuba semula.'},503);}finally{if(locked)await unlockBookingRoom(locked.id,locked.token).catch(()=>{});}}
export const POST=change;export const PUT=change;export const DELETE=change;
