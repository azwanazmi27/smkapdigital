import {env} from 'cloudflare:workers';
import {defaultNotificationSettings} from '../notification-settings-model';
import {notificationJobsDue} from '../notification-due-model';
// Read only clock settings until a notification can be due. Full timetables and
// teacher names are not read or matched on idle minutes.
export async function notificationDue(now:Date){
 const rows=await env.DB.batch([
  env.DB.prepare("SELECT data_json FROM notification_settings WHERE id='automated'"),
  env.DB.prepare("SELECT json_extract(data_json,'$.times') AS times FROM mainstream_times WHERE id='active'"),
  env.DB.prepare("SELECT json_extract(data_json,'$.times') AS times FROM form6_timetable WHERE id='active'"),
  env.DB.prepare("INSERT INTO notification_runs(id,kind,started_at,finished_at,status) VALUES('scheduler-heartbeat','scheduler',?,?,'completed') ON CONFLICT(id) DO UPDATE SET started_at=excluded.started_at,finished_at=excluded.finished_at,status='completed'").bind(new Date().toISOString(),new Date().toISOString())
 ]);
 const settings={...defaultNotificationSettings,...(rows[0].results[0]?JSON.parse(String(rows[0].results[0].data_json)): {})};
 const times=(i:number)=>rows[i].results[0]?.times?JSON.parse(String(rows[i].results[0].times)):[];
 return notificationJobsDue(now,settings,times(1),times(2));
}
