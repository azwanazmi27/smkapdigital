CREATE TABLE IF NOT EXISTS name_match_mappings (
 id TEXT PRIMARY KEY,
 source_name TEXT NOT NULL,
 normalized_source_name TEXT NOT NULL UNIQUE,
 user_id TEXT REFERENCES portal_users(id),
 matched_user_name TEXT,
 match_type TEXT NOT NULL CHECK(match_type IN ('confirmed','no_match')),
 similarity_score REAL,
 confirmed_by TEXT NOT NULL,
 confirmed_at TEXT NOT NULL,
 usage_count INTEGER NOT NULL DEFAULT 0,
 last_used_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS name_match_mappings_user_idx ON name_match_mappings(user_id);
CREATE TABLE IF NOT EXISTS name_match_settings (id TEXT PRIMARY KEY, high REAL NOT NULL, review REAL NOT NULL, margin REAL NOT NULL);
INSERT OR IGNORE INTO name_match_settings VALUES('default',95,85,5);
