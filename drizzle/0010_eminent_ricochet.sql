CREATE TABLE IF NOT EXISTS `absence_reason_settings` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `absence_reasons` (
	`reason` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
