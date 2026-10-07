import {waitUntil} from 'cloudflare:workers';
import {env} from 'cloudflare:workers';
import {portalActor} from '../../server-auth';
import {notificationSettings} from '../../lib/notification-settings';
import {validateNotificationSettings} from '../../notification-settings-model';
import {malaysiaDay,validDate} from '../../staff-work-model';
export async function GET(request:Request){
 const me=await portalActor(request);if(!me||!['admin','super_admin'].includes(me.role))return Response.json({error:'Akses pentadbir diperlukan.'},{status:403});
 try{
 const date=new URL(request.url).searchParams.get('date')||malaysiaDay();if(!validDate(date))return Response.json({error:'Tarikh tidak sah.'},{status:400});
 const start=new Date(`${date}T00:00:00+08:00`).toISOString(),end=new Date(Date.parse(start)+86400000).toISOString();
 const [settings,runs,deliveries,subscriptions,heartbeat]=await Promise.all([
 notificationSettings(),
 env.DB.prepare('SELECT id,kind,started_at AS startedAt,finished_at AS finishedAt,status,error FROM notification_runs WHERE started_at>=? AND started_at<? ORDER BY started_at DESC LIMIT 180').bind(start,end).all(),
 env.DB.prepare(`SELECT d.task_id AS taskId,d.user_id AS userId,d.subscription_id AS subscriptionId,d.status,d.created_at AS createdAt,d.updated_at AS updatedAt,u.name,COALESCE(x.title,'') AS title,COALESCE(x.error,'') AS error FROM staff_task_push_deliveries d LEFT JOIN portal_users u ON u.id=d.user_id LEFT JOIN notification_delivery_details x ON x.task_id=d.task_id AND x.subscription_id=d.subscription_id WHERE d.created_at>=? AND d.created_at<? ORDER BY d.created_at DESC LIMIT 1000`).bind(start,end).all(),
 env.DB.prepare("SELECT u.name,COUNT(s.id) AS devices FROM portal_users u LEFT JOIN push_subscriptions s ON s.user_id=u.id WHERE u.status='active' AND u.deleted_at IS NULL GROUP BY u.id ORDER BY u.name").all(),
 env.DB.prepare("SELECT MAX(started_at) AS latest FROM notification_runs WHERE kind IN ('class','relief','morning')").first<{latest:string|null}>()]);
 return Response.json({settings,runs:runs.results,deliveries:deliveries.results,subscriptions:subscriptions.results,date,heartbeat:heartbeat?.latest||null},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('Notification monitor',error);return Response.json({error:'Rekod notifikasi belum dapat dibaca. Cuba segarkan semula.'},{status:500});}
}
export async function PUT(request:Request){
 const me=await portalActor(request);if(!me||!['admin','super_admin'].includes(me.role))return Response.json({error:'Akses pentadbir diperlukan.'},{status:403});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Permintaan tidak dibenarkan.'},{status:403});
 let settings;try{settings=validateNotificationSettings(await request.json());}catch(e){return Response.json({error:(e as Error).message},{status:400});}
 await env.DB.prepare("INSERT INTO notification_settings(id,data_json,updated_at,updated_by) VALUES('automated',?,?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(JSON.stringify(settings),new Date().toISOString(),me.id).run();
 return Response.json({settings});
}

export async function POST(request:Request){
 const me=await portalActor(request);if(!me||!['admin','super_admin'].includes(me.role))return Response.json({error:'Akses pentadbir diperlukan.'},{status:403});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Permintaan tidak dibenarkan.'},{status:403});
 const scheduler=(env as unknown as {NOTIFICATION_SCHEDULER:{retryMorning():Promise<unknown>;retryDelivery(target:{userId:string;taskId:string;subscriptionId:string}):Promise<unknown>}}).NOTIFICATION_SCHEDULER;
 let input:Record<string,unknown>={};
 try{const text=await request.text();if(text)input=JSON.parse(text);}catch{return Response.json({error:'Permintaan tidak sah.'},{status:400});}
 if(input.action==='retry-delivery'){
  const {userId,taskId,subscriptionId}=input;
  if(typeof userId!=='string'||!userId||userId.length>200||typeof taskId!=='string'||!taskId||taskId.length>2000||typeof subscriptionId!=='string'||!subscriptionId||subscriptionId.length>200)return Response.json({error:'Pilih rekod penghantaran yang sah.'},{status:400});
  const id=crypto.randomUUID(),started=new Date().toISOString();
  await env.DB.prepare("INSERT INTO notification_runs(id,kind,started_at,status) VALUES(?,'retry-manual',?,'running')").bind(id,started).run();
  try{
   const result=await scheduler.retryDelivery({userId,taskId,subscriptionId}) as {status:string;message:string};
   await env.DB.prepare('UPDATE notification_runs SET status=?,finished_at=?,error=? WHERE id=?').bind(result.status==='sent'?'completed':result.status==='failed'?'failed':'skipped',new Date().toISOString(),result.status==='sent'?'':result.message,id).run();
   return Response.json(result);
  }catch(error){
   console.error('Individual notification retry',error);
   await env.DB.prepare("UPDATE notification_runs SET status='failed',finished_at=?,error=? WHERE id=?").bind(new Date().toISOString(),'Percubaan semula terhenti.',id).run();
   return Response.json({error:'Percubaan semula belum dapat disahkan. Segarkan rekod sebelum mencuba lagi.'},{status:500});
  }
 }
 if(input.action)return Response.json({error:'Tindakan tidak sah.'},{status:400});
 waitUntil(scheduler.retryMorning().catch(e=>console.error('Manual morning retry',e)));
 return Response.json({message:'Percubaan semula dimulakan untuk ringkasan hari ini, maksimum 35 peranti. Penerima yang sudah berjaya tidak dihantar semula. Segarkan rekod selepas sebentar; cuba lagi jika masih ada baki.'},{status:202});
}
