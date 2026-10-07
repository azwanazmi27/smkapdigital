# Class reminders

Apply `drizzle/0017_mainstream_times.sql` before deploying. The seed is the school-supplied PDF timetable; INSERT OR IGNORE preserves subsequent administrator edits.

The dedicated `notifications.wrangler.json` configuration includes:

```json
{"triggers":{"crons":["* * * * *"]}}
```

`worker/notifications.ts` runs reminders each minute. The portal worker must have no cron triggers. Staging (`MIGRATION_MODE`) does not send. The job uses Asia/Kuala_Lumpur, the active teacher timetable and editable mainstream times, with active Form Six schedules taking precedence. Only subscribed active users receive their own sessions. Unknown/missing times, recess and recorded absence overlapping the lesson are excluded. The target is ten minutes before each session, with a three-minute retry window after that target; delayed retries state the actual remaining minutes. Push TTL is ten minutes. Delivery keys include date, user, class, subject and start time and are claimed per subscription to avoid repeat sends. Device permission and connectivity determine actual delivery.

The job uses the existing VAPID bindings and `staff_task_push_deliveries`. It does not send reminder push notifications from page loads.

Morning summaries target 07:25 Malaysia time on weekdays, with recovery retries until 07:45. Successful deliveries remain deduplicated by date, user and device. Failed deliveries may retry; abandoned sending claims expire after two minutes. Provider acceptance is recorded as sent, not proof of device display.

Teacher-name matches and misses are cached once per class-reminder run to avoid repeated fuzzy matching across every user. Scheduled jobs run sequentially, using the scheduled event timestamp, and log start/completion/failure for each stage. This avoids the CPU exhaustion observed in production.

Time-sensitive class and relief jobs run before morning summaries, which have a longer recovery window. Scheduled jobs share a 35-delivery attempt budget per invocation to stay below the external subrequest limit. Remaining unsent notices are revisited on the next minute within their recovery window; sent notices do not consume the attempt budget.


## Separate scheduler and administrator monitoring

Apply `drizzle/0018_notification_monitor.sql`, build/deploy the portal (exports `NotificationPushService`), then `npm run build:notifications` and `wrangler deploy --config notifications.wrangler.json`. The scheduler has no public HTTP endpoint and sends through the portal service binding, retaining existing VAPID secrets. The portal configuration needs `NOTIFICATION_SCHEDULER` bound to `portal-notifications`, entrypoint `NotificationScheduler`, and empty cron triggers. Do not restore the old portal cron: its large application startup exceeded the Free-plan CPU budget even when tests passed.

Settings → Notifications includes administrator-only automated settings, date-filtered delivery results, provider errors, scheduler runs and users without devices. A completed scheduler run is not a delivery receipt. Old delivery rows have no detailed error information. Running jobs older than three minutes are shown as stalled (including CPU termination, which cannot execute a catch handler). Run history is retained for 14 days. Manual recovery only targets today's unsent summary, 35 devices per request, and preserves delivery deduplication.

Defaults remain weekdays 07:25 Malaysia time and reminders 10 minutes before class/relief. Administrators can edit the time, greeting, closing and lead time. Current-day e-Keberadaan records override the normal summary with a personalized absence greeting, MC/cuti sakit recovery wish or the actual other reason with an ease-of-affairs wish. Future/expired absence records are excluded by date range. Teacher-name matching uses the same persistent mappings as tasks.

Time-sensitive notifications use high push urgency. Each push network request has a ten-second timeout so an unresponsive provider cannot indefinitely block later teachers. The admin screen shows the latest scheduler heartbeat and warns when no fresh run has started for more than three minutes.
