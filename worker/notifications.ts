import {WorkerEntrypoint} from 'cloudflare:workers';
import {sendMorningSummaries} from '../app/lib/daily-notices';
import {sendClassReminders} from '../app/lib/class-reminders';
import {sendReliefReminders} from '../app/lib/relief-reminders';
export default {
 async scheduled(event:{scheduledTime:number},env:{DB:D1Database;MIGRATION_MODE?:string},ctx:ExecutionContext){
  if(env.MIGRATION_MODE)return;
  ctx.waitUntil((async()=>{
   const budget={remaining:35},now=new Date(event.scheduledTime);
   for(const [kind,run] of [['class',sendClassReminders],['relief',sendReliefReminders],['morning',sendMorningSummaries]] as const){
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO notification_runs(id,kind,started_at,status) VALUES(?,?,?,'running')").bind(id,kind,new Date().toISOString()).run();
    try{await run(now,budget);await env.DB.prepare("UPDATE notification_runs SET status='completed',finished_at=? WHERE id=?").bind(new Date().toISOString(),id).run();}
    catch(error){console.error('Notification job failed',kind,error);await env.DB.prepare("UPDATE notification_runs SET status='failed',finished_at=?,error=? WHERE id=?").bind(new Date().toISOString(),String(error).slice(0,300),id).run();}
   }
   if(now.getUTCMinutes()===0)await env.DB.prepare("DELETE FROM notification_runs WHERE started_at < datetime('now','-14 days')").run();
  })());
 },
 async fetch(){return new Response('Not found',{status:404});}
};

export class NotificationScheduler extends WorkerEntrypoint<{DB:D1Database;MIGRATION_MODE?:string}> {
 async retryMorning(){
  if(this.env.MIGRATION_MODE)throw new Error('Staging does not send');
  const id=crypto.randomUUID();
  await this.env.DB.prepare("INSERT INTO notification_runs(id,kind,started_at,status) VALUES(?,'morning-manual',?,'running')").bind(id,new Date().toISOString()).run();
  try{await sendMorningSummaries(new Date(),{remaining:35},true);await this.env.DB.prepare("UPDATE notification_runs SET status='completed',finished_at=? WHERE id=?").bind(new Date().toISOString(),id).run();}
  catch(e){await this.env.DB.prepare("UPDATE notification_runs SET status='failed',finished_at=?,error=? WHERE id=?").bind(new Date().toISOString(),String(e).slice(0,300),id).run();throw e;}
  return {success:true};
 }
}
