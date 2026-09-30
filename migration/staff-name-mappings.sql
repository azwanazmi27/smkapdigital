CREATE TABLE IF NOT EXISTS staff_name_mappings (
 name_key TEXT PRIMARY KEY NOT NULL,
 source_name TEXT NOT NULL,
 user_id TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
