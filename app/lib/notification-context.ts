import {env} from 'cloudflare:workers';
import {malaysiaDay,type PersonalAbsence} from '../staff-work-model';
import {defaultNotificationSettings,type NotificationSettings} from '../notification-settings-model';
// One fresh database snapshot per cron invocation. Never cache mutable schedules
// between invocations: a changed relief plan or absence must take effect next minute.
export async function notificationContext(now:Date){
 const today=malaysiaDay(now);
 const rows=await env.DB.batch([
  env.DB.prepare("SELECT id,name FROM portal_users WHERE status='active' AND deleted_at IS NULL"),
  env.DB.prepare("SELECT teachers_json FROM relief_schedules WHERE is_active='1' ORDER BY created_at DESC,rowid DESC LIMIT 1"),
  env.DB.prepare("SELECT data_json FROM mainstream_times WHERE id='active'"),
  env.DB.prepare("SELECT data_json FROM form6_timetable WHERE id='active'"),
  env.DB.prepare("SELECT id,date,file_name AS fileName,assignments_json AS assignmentsJson FROM relief_plans WHERE date=? ORDER BY rowid DESC LIMIT 1").bind(today),
  env.DB.prepare("SELECT id,teacher_name AS teacherName,absence_date AS absenceDate,end_date AS endDate,reason,duration,start_time AS startTime,end_time AS endTime FROM absences WHERE absence_date<=? AND COALESCE(NULLIF(end_date,''),absence_date)>=?").bind(today,today),
  env.DB.prepare('SELECT m.name_key,m.user_id FROM staff_name_mappings m JOIN portal_users u ON u.id=m.user_id WHERE u.status=\'active\' AND u.deleted_at IS NULL'),
  env.DB.prepare('SELECT DISTINCT user_id FROM push_subscriptions'),
  env.DB.prepare("SELECT data_json FROM notification_settings WHERE id='automated'")
 ]);
 return {
  users:{results:rows[0].results as {id:string;name:string}[]},
  schedule:(rows[1].results[0]??null) as {teachers_json:string}|null,
  timing:(rows[2].results[0]??null) as {data_json:string}|null,
  form6:(rows[3].results[0]??null) as {data_json:string}|null,
  plan:(rows[4].results[0]??null) as {id:string;date:string;fileName:string;assignmentsJson:string}|null,
  absences:{results:rows[5].results as PersonalAbsence[]},
  mappings:Object.fromEntries(rows[6].results.map(r=>[r.name_key,r.user_id])) as Record<string,string>,
  subscribed:{results:rows[7].results as {user_id:string}[]},
  settings:{...defaultNotificationSettings,...(rows[8].results[0]?JSON.parse(String(rows[8].results[0].data_json)): {})} as NotificationSettings
 };
}
export type NotificationContext=Awaited<ReturnType<typeof notificationContext>>;
