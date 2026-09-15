CREATE TABLE `ai_daily_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`minute` integer NOT NULL,
	`minute_requests` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_daily_usage_user_day` ON `ai_daily_usage` (`user_id`,`day`);