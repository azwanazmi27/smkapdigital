CREATE TABLE IF NOT EXISTS notification_settings (id TEXT PRIMARY KEY, data_json TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notification_runs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL, error TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS notification_runs_started ON notification_runs(started_at);
CREATE TABLE IF NOT EXISTS notification_delivery_details (task_id TEXT NOT NULL, subscription_id TEXT NOT NULL, title TEXT NOT NULL, error TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, PRIMARY KEY(task_id,subscription_id));
