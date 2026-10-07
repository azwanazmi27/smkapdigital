import {env} from 'cloudflare:workers';
import {defaultNotificationSettings,type NotificationSettings} from '../notification-settings-model';
export async function notificationSettings():Promise<NotificationSettings>{
 const row=await env.DB.prepare("SELECT data_json FROM notification_settings WHERE id='automated'").first<{data_json:string}>();
 return {...defaultNotificationSettings,...(row?JSON.parse(row.data_json):{})};
}
