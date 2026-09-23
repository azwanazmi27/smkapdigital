import {env} from 'cloudflare:workers';
import type {PortalActor} from '../../server-auth';

export type AIUsage = {day:string;used:number;limit:number|null;remaining:number|null;exempt:boolean};
type Actor = Pick<PortalActor,'id'|'email'|'role'>;
export function usagePolicy(actor:Actor){
  return {limit:3,exempt:actor.role==='admin'||actor.role==='super_admin'};
}
export const usageDay=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
function result(actor:Actor,day:string,used:number):AIUsage{const p=usagePolicy(actor);return {day,used,limit:p.exempt?null:p.limit,remaining:p.exempt?null:Math.max(0,p.limit-used),exempt:p.exempt};}
export async function getAIUsage(actor:Actor):Promise<AIUsage>{
  const day=usageDay(),row=await env.DB.prepare('SELECT requests FROM ai_daily_usage WHERE user_id=? AND day=?').bind(actor.id||actor.email,day).first<{requests:number}>();
  return result(actor,day,row?.requests||0);
}
// One atomic reservation across all AI endpoints; provider fallbacks consume no additional allowance.
export async function reserveAIUsage(actor:Actor):Promise<{usage:AIUsage;error?:string}>{
  const now=new Date(),day=usageDay(now),minute=Math.floor(now.getTime()/60000),userId=actor.id||actor.email,p=usagePolicy(actor);
  const row=await env.DB.prepare(`INSERT INTO ai_daily_usage(id,user_id,day,requests,minute,minute_requests,updated_at)
    VALUES(?,?,?,1,?,1,?) ON CONFLICT(user_id,day) DO UPDATE SET requests=ai_daily_usage.requests+1,
    minute=excluded.minute,minute_requests=CASE WHEN ai_daily_usage.minute=excluded.minute THEN ai_daily_usage.minute_requests+1 ELSE 1 END,
    updated_at=excluded.updated_at WHERE (?=1 OR ai_daily_usage.requests<?) AND (?=1 OR ai_daily_usage.minute!=excluded.minute OR ai_daily_usage.minute_requests<4)
    RETURNING requests`).bind(`${userId}:${day}`,userId,day,minute,now.toISOString(),p.exempt?1:0,p.limit,p.exempt?1:0).first<{requests:number}>();
  if(row)return {usage:result(actor,day,row.requests)};
  const usage=await getAIUsage(actor);
  return {usage,error:usage.remaining===0?`Had ${usage.limit} permintaan AI hari ini telah digunakan. Had diperbaharui pada 12 tengah malam waktu Malaysia. Anda masih boleh menyunting dan menyimpan secara manual.`:'Maksimum 4 permintaan AI seminit. Cuba semula sebentar lagi.'};
}
