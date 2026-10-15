import {env} from 'cloudflare:workers';
import type {BookingBlock} from '../booking-block-model';
let ready:Promise<void>|undefined;
export function ensureBookingControls(){return ready??=(async()=>{
 await env.DB.batch([
  env.DB.prepare('CREATE TABLE IF NOT EXISTS booking_room_coordinators(room_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,updated_at TEXT NOT NULL,updated_by TEXT NOT NULL)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_room_coordinator_user ON booking_room_coordinators(user_id)'),
  env.DB.prepare('CREATE TABLE IF NOT EXISTS booking_room_blocks(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,weekday INTEGER NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,effective_from TEXT NOT NULL,reason TEXT NOT NULL,created_by TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_booking_blocks_room ON booking_room_blocks(room_id,deleted_at)'),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS booking_coordinator_notices(task_id TEXT PRIMARY KEY,booking_id TEXT NOT NULL,room_id TEXT NOT NULL,user_id TEXT NOT NULL,notice_json TEXT NOT NULL,expires_at TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT NOT NULL,created_at TEXT NOT NULL)"),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_booking_notice_due ON booking_coordinator_notices(state,next_attempt_at)')
 ]);
 })().catch(error=>{ready=undefined;throw error;});}
export async function bookingBlocks(roomId?:string):Promise<BookingBlock[]>{await ensureBookingControls();return (await env.DB.prepare(`SELECT b.id,b.room_id AS roomId,b.weekday,b.start_time AS startTime,b.end_time AS endTime,b.effective_from AS effectiveFrom,b.reason FROM booking_room_blocks b JOIN booking_rooms r ON r.id=b.room_id AND r.deleted_at IS NULL WHERE b.deleted_at IS NULL ${roomId?'AND b.room_id=?':''} ORDER BY b.weekday,b.start_time`).bind(...(roomId?[roomId]:[])).all<BookingBlock>()).results;}
export async function roomCoordinators(){await ensureBookingControls();return (await env.DB.prepare("SELECT c.room_id AS roomId,c.user_id AS userId,u.name FROM booking_room_coordinators c JOIN portal_users u ON u.id=c.user_id AND u.status='active' AND u.deleted_at IS NULL").all<{roomId:string;userId:string;name:string}>()).results;}
