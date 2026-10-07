import { env } from 'cloudflare:workers';
import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';

export type TaskNotice = { userId: string; taskId: string; title: string; body: string; url: string; ttl?: number };

// A delivery is keyed by the assignment and device, so a repeated publication
// cannot alert the same teacher twice for the same task.
export type PushBudget = { remaining: number };
export async function sendTaskNotices(notices: TaskNotice[], budget?: PushBudget) {
  const gateway=(env as unknown as {PUSH_SERVICE?:{send(notices:TaskNotice[],remaining:number):Promise<number>}}).PUSH_SERVICE;
  if(gateway){const left=await gateway.send(notices,budget?.remaining??35);if(budget)budget.remaining=left;return;}
  const publicKey = env.VAPID_SERVER_PUBLIC_KEY || '';
  const privateKey = env.VAPID_SERVER_PRIVATE_KEY || '';
  if (!notices.length) return;
  if (!publicKey || !privateKey) throw new Error('Push VAPID keys are unavailable');
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS staff_task_push_deliveries (task_id TEXT NOT NULL, subscription_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(task_id,subscription_id))").run();
  const keys = { subject: env.VAPID_SUBJECT || 'mailto:sekolah-2508@moe-dl.edu.my', publicKey, privateKey };
  for (const notice of notices) {
    const subscriptions = await env.DB.prepare("SELECT s.id,s.endpoint,s.p256dh,s.auth FROM push_subscriptions s JOIN portal_users u ON u.id=s.user_id WHERE s.user_id=? AND u.status='active' AND u.deleted_at IS NULL").bind(notice.userId).all<{ id:string; endpoint:string; p256dh:string; auth:string }>();
    for (const row of subscriptions.results) {
      if (budget && budget.remaining <= 0) return;
      const now = new Date().toISOString();
      const claim = await env.DB.prepare("INSERT INTO staff_task_push_deliveries(task_id,subscription_id,user_id,status,created_at,updated_at) VALUES(?,?,?,'sending',?,?) ON CONFLICT(task_id,subscription_id) DO UPDATE SET status='sending',updated_at=excluded.updated_at WHERE staff_task_push_deliveries.status='failed' OR (staff_task_push_deliveries.status='sending' AND staff_task_push_deliveries.updated_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 minutes'))").bind(notice.taskId,row.id,notice.userId,now,now).run();
      if (!claim.meta.changes) continue;
      if (budget) budget.remaining--;
      let status = 'failed',failure='';
      try {
        const subscription: PushSubscription = { endpoint: row.endpoint, expirationTime: null, keys: { p256dh: row.p256dh, auth: row.auth } };
        const init = await buildPushPayload({ data: { title: notice.title, body: notice.body, url: notice.url, tag: `task-${notice.taskId}` }, options: { ttl: notice.ttl ?? 86400, urgency: 'normal' } }, subscription, keys);
        const response = await fetch(row.endpoint, init as RequestInit);
        if (response.ok) status = 'sent';
        else {failure=`HTTP ${response.status}`;console.warn('Task push rejected',response.status,notice.taskId);}
        if (response.status === 404 || response.status === 410) await env.DB.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(row.id).run();
      } catch (error) { failure=error instanceof Error?error.name+': penghantaran terhenti':'Penghantaran terhenti';console.error('Task push delivery failed', error); }
      await env.DB.prepare('INSERT INTO notification_delivery_details(task_id,subscription_id,title,error,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(task_id,subscription_id) DO UPDATE SET title=excluded.title,error=excluded.error,updated_at=excluded.updated_at').bind(notice.taskId,row.id,notice.title,failure,new Date().toISOString()).run();
      await env.DB.prepare('UPDATE staff_task_push_deliveries SET status=?,updated_at=? WHERE task_id=? AND subscription_id=?').bind(status,new Date().toISOString(),notice.taskId,row.id).run();
    }
  }
}
