# Class reminders

Apply `drizzle/0017_mainstream_times.sql` before deploying. The seed is the school-supplied PDF timetable; INSERT OR IGNORE preserves subsequent administrator edits.

The production Wrangler configuration must include:

```json
{"triggers":{"crons":["* * * * *"]}}
```

`worker/index.ts` runs reminders each minute. Staging (`MIGRATION_MODE`) does not send. The job uses Asia/Kuala_Lumpur, the active teacher timetable and editable mainstream times, with active Form Six schedules taking precedence. Only subscribed active users receive their own sessions. Unknown/missing times, recess and recorded absence overlapping the lesson are excluded. The target is ten minutes before each session, with a three-minute retry window after that target; delayed retries state the actual remaining minutes. Push TTL is ten minutes. Delivery keys include date, user, class, subject and start time and are claimed per subscription to avoid repeat sends. Device permission and connectivity determine actual delivery.

The job uses the existing VAPID bindings and `staff_task_push_deliveries`. It does not send reminder push notifications from page loads.

Morning summaries target 07:25 Malaysia time on weekdays, with recovery retries until 07:45. Successful deliveries remain deduplicated by date, user and device. Failed deliveries may retry; abandoned sending claims expire after two minutes. Provider acceptance is recorded as sent, not proof of device display.

Teacher-name matches and misses are cached once per class-reminder run to avoid repeated fuzzy matching across every user. Scheduled jobs run sequentially, using the scheduled event timestamp, and log start/completion/failure for each stage. This avoids the CPU exhaustion observed in production.

Scheduled jobs share a 40-delivery attempt budget per invocation to stay below the external subrequest limit. Remaining unsent notices are revisited on the next minute within their recovery window; sent notices do not consume the attempt budget.
