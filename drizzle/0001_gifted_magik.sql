CREATE TABLE `relief_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`day` text NOT NULL,
	`created_by` text NOT NULL,
	`assignments_json` text NOT NULL,
	`file_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relief_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`source_label` text NOT NULL,
	`teacher_count` text NOT NULL,
	`is_active` text NOT NULL,
	`teachers_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relief_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`updated_at` text NOT NULL
);
