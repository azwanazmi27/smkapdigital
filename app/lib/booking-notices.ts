import {env} from 'cloudflare:workers';
import {ensureBookingControls,roomCoordinators} from './booking-controls';
import {sendTaskNotices,type TaskNotice,type PushBudget} from './task-push';
import {TASKS_URL} from '../daily-notice-model';
import type {Booking} from '../booking-client';
const display=(day:string,time:string)=>`${day.slice(8,10)}/${day.slice(5,7)}/${day.slice(0,4)}, ${time}`;
export async function queueBookingNotice(room:{id:string;name:string},booking:Booking){
 const coordinator=(await roomCoordinators()).find(c=>c.roomId===room.id);if(!coordinator)return;
 const taskId=`booking-coordinator:${booking.id}:${coordinator.userId}`,now=new Date().toISOString();
 const notice:TaskNotice={userId:coordinator.userId,taskId,title:`Tempahan baharu · ${room.name}`,body:`${booking.applicantName} menempah ${room.name}.\nMula: ${display(booking.startDate,booking.startTime)}\nTamat: ${display(booking.endDate,booking.endTime)}\nTujuan: ${booking.purpose}\nLihat tempahan bilik seliaan di Ruang Kerja Saya.`,url:TASKS_URL};
 await env.DB.prepare('INSERT OR IGNORE INTO booking_coordinator_notices(task_id,booking_id,room_id,user_id,notice_json,expires_at,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(taskId,booking.id,room.id,coordinator.userId,JSON.stringify(notice),new Date(`${booking.endDate}T${booking.endTime}:00+08:00`).toISOString(),now,now).run();
}
export async function currentBookingNotice(taskId:string,userId:string):Promise<TaskNotice|undefined>{
 await ensureBookingControls();
 const row=await env.DB.prepare("SELECT n.notice_json FROM booking_coordinator_notices n JOIN booking_room_coordinators c ON c.room_id=n.room_id AND c.user_id=n.user_id JOIN booking_rooms r ON r.id=n.room_id AND r.deleted_at IS NULL JOIN portal_users u ON u.id=n.user_id AND u.status='active' AND u.deleted_at IS NULL WHERE n.task_id=? AND n.user_id=? AND n.state<>'cancelled' AND n.expires_at>?").bind(taskId,userId,new Date().toISOString()).first<{notice_json:string}>();
 return row?JSON.parse(row.notice_json):undefined;
}
export async function cancelBookingNotice(bookingId:string){await ensureBookingControls();await env.DB.prepare("UPDATE booking_coordinator_notices SET state='cancelled' WHERE booking_id=?").bind(bookingId).run();}
// Small, persisted outbox. Failed sends retry at most three times; device-level
// delivery keys prevent duplicate alerts. Existing admin retry remains available.
export async function flushBookingNotices(budget:PushBudget={remaining:5},onlyBookingId?:string){
 await ensureBookingControls();const now=new Date().toISOString();
 const rows=(await env.DB.prepare(`SELECT task_id,user_id FROM booking_coordinator_notices WHERE state='pending' AND attempts<3 AND next_attempt_at<=? AND expires_at>? ${onlyBookingId?'AND booking_id=?':''} ORDER BY created_at LIMIT 5`).bind(now,now,...(onlyBookingId?[onlyBookingId]:[])).all<{task_id:string;user_id:string}>()).results;
 for(const row of rows){
  if(budget.remaining<=0)break;
  const claim=await env.DB.prepare("UPDATE booking_coordinator_notices SET attempts=attempts+1,next_attempt_at=? WHERE task_id=? AND state='pending' AND attempts<3 AND next_attempt_at<=?").bind(new Date(Date.now()+120000).toISOString(),row.task_id,now).run();if(!claim.meta.changes)continue;
  const notice=await currentBookingNotice(row.task_id,row.user_id);
  if(!notice){await env.DB.prepare("UPDATE booking_coordinator_notices SET state='cancelled' WHERE task_id=?").bind(row.task_id).run();continue;}
  try{
   await sendTaskNotices([notice],budget);
   const devices=(await env.DB.prepare("SELECT d.status FROM push_subscriptions s LEFT JOIN staff_task_push_deliveries d ON d.subscription_id=s.id AND d.task_id=? WHERE s.user_id=?").bind(row.task_id,row.user_id).all<{status:string|null}>()).results;
   if(!devices.length||devices.every(d=>d.status==='sent'))await env.DB.prepare("UPDATE booking_coordinator_notices SET state=? WHERE task_id=? AND state='pending'").bind(devices.length?'sent':'no_device',row.task_id).run();
  }catch(error){console.error('Coordinator booking push failed',error);}
 }
}
