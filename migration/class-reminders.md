# Class reminders

Apply `drizzle/0017_mainstream_times.sql` before deploying. The seed is the school-supplied PDF timetable; INSERT OR IGNORE preserves subsequent administrator edits.

The production Wrangler configuration must include:

```json
{"triggers":{"crons":["* * * * *"]}}
```

`worker/index.ts` runs reminders each minute. Staging (`MIGRATION_MODE`) does not send. The job uses Asia/Kuala_Lumpur, the active teacher timetable and editable mainstream times, with active Form Six schedules taking precedence. Only subscribed active users receive their own sessions. Unknown/missing times, recess and recorded absence overlapping the lesson are excluded. No catch-up messages are sent outside the minute ten minutes before the session; push TTL is ten minutes. Delivery keys include date, user, class, subject and start time and are claimed per subscription to avoid repeat sends. Device permission and connectivity determine actual delivery.

The job uses the existing VAPID bindings and `staff_task_push_deliveries`. It does not send reminder push notifications from page loads.
