import {notificationDue} from '../app/lib/notification-due';
import {notificationContext} from '../app/lib/notification-context';
import {retryNotification} from '../app/lib/notification-retry';
import type {RetryTarget} from '../app/notification-retry-model';
import {WorkerEntrypoint} from 'cloudflare:workers';
import {sendMorningSummaries} from '../app/lib/daily-notices';
import {sendClassReminders} from '../app/lib/class-reminders';
import {sendReliefReminders} from '../app/lib/relief-reminders';
export default {
 async scheduled(event:{scheduledTime:number},env:{DB:D1Database;MIGRATION_MODE?:string},ctx:ExecutionContext){
  if(env.MIGRATION_MODE)return;
  ctx.waitUntil((async()=>{
   const budget={remaining:35},now=new Date(event.scheduledTime),due=await notificationDue(now);
   if(!due.class&&!due.relief&&!due.morning)return;
   const context=await notificationContext(now);
   const jobs=([
    ['class',()=>sendClassReminders(now,budget,undefined,context)],
    ['relief',()=>sendReliefReminders(now,budget,undefined,context)],
    ['morning',()=>sendMorningSummaries(now,budget,false,undefined,context)]
   ] as const).filter(([kind])=>due[kind]).map(([kind,run])=>({kind,run,id:crypto.randomUUID()}));
   await env.DB.batch(jobs.map(({id,kind})=>env.DB.prepare("INSERT INTO notification_runs(id,kind,started_at,status) VALUES(?,?,?,'running')").bind(id,kind,new Date().toISOString())));
   const updates=[];
   for(const {kind,run,id} of jobs){
    try{await run();updates.push(env.DB.prepare("UPDATE notification_runs SET status='completed',finished_at=? WHERE id=?").bind(new Date().toISOString(),id));}
    catch(error){console.error('Notification job failed',kind,error);updates.push(env.DB.prepare("UPDATE notification_runs SET status='failed',finished_at=?,error=? WHERE id=?").bind(new Date().toISOString(),String(error).slice(0,300),id));}
   }
   await env.DB.batch(updates);
   if(now.getUTCMinutes()===0)await env.DB.prepare("DELETE FROM notification_runs WHERE started_at < datetime('now','-14 days')").run();
  })());
 },
 async fetch(){return new Response('Not found',{status:404});}
};

export class NotificationScheduler extends WorkerEntrypoint<{DB:D1Database;MIGRATION_MODE?:string}> {
 async retryDelivery(target:RetryTarget){
  if(this.env.MIGRATION_MODE)throw new Error('Staging does not send');
  return retryNotification(target);
 }
 async retryMorning(){
  if(this.env.MIGRATION_MODE)throw new Error('Staging does not send');
  const id=crypto.randomUUID();
  await this.env.DB.prepare("INSERT INTO notification_runs(id,kind,started_at,status) VALUES(?,'morning-manual',?,'running')").bind(id,new Date().toISOString()).run();
  try{await sendMorningSummaries(new Date(),{remaining:35},true);await this.env.DB.prepare("UPDATE notification_runs SET status='completed',finished_at=? WHERE id=?").bind(new Date().toISOString(),id).run();}
  catch(e){await this.env.DB.prepare("UPDATE notification_runs SET status='failed',finished_at=?,error=? WHERE id=?").bind(new Date().toISOString(),String(e).slice(0,300),id).run();throw e;}
  return {success:true};
 }
}
