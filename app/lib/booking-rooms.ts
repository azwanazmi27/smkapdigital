import {env} from 'cloudflare:workers';
export type BookingRoom={id:string;sourceName:string;name:string;description:string;deletedAt:string|null};
// One-time migration seeds only. Settings in D1 are authoritative thereafter.
const seeds=['Pusat Sumber Sekolah','Pusat Akses','Bilik Gerakan','Bilik KKQ','Bilik Media','Makmal Sibaweh','Makmal Komputer 1','Makmal Komputer 2','Dewan Al Farabi','Surau As-Syafie','Bilik Seni'];
let ready:Promise<void>|undefined;
export function ensureBookingRooms(){return ready??=(async()=>{
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS booking_rooms(id TEXT PRIMARY KEY,source_name TEXT NOT NULL UNIQUE,name TEXT NOT NULL COLLATE NOCASE UNIQUE,description TEXT NOT NULL DEFAULT '',deleted_at TEXT,lock_token TEXT,lock_until INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)").run();
 await env.DB.batch(seeds.map((name,i)=>env.DB.prepare("INSERT OR IGNORE INTO booking_rooms(id,source_name,name,updated_at) VALUES(?,?,?,?)").bind(`legacy-${i+1}`,name,name,new Date().toISOString())));
})().catch(error=>{ready=undefined;throw error;});}
export async function bookingRooms(includeDeleted=false):Promise<BookingRoom[]>{await ensureBookingRooms();return (await env.DB.prepare(`SELECT id,source_name AS sourceName,name,description,deleted_at AS deletedAt FROM booking_rooms ${includeDeleted?'':'WHERE deleted_at IS NULL'} ORDER BY name COLLATE NOCASE`).all<BookingRoom>()).results;}
export async function lockBookingRoom(id:string){await ensureBookingRooms();const token=crypto.randomUUID();const result=await env.DB.prepare('UPDATE booking_rooms SET lock_token=?,lock_until=? WHERE id=? AND deleted_at IS NULL AND lock_until<?').bind(token,Date.now()+120000,id,Date.now()).run();return result.meta.changes?token:null;}
export async function unlockBookingRoom(id:string,token:string){await env.DB.prepare('UPDATE booking_rooms SET lock_token=NULL,lock_until=0 WHERE id=? AND lock_token=?').bind(id,token).run();}
