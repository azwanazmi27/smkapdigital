CREATE TABLE `opr_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`view_url` text NOT NULL,
	`preview_url` text NOT NULL,
	`download_url` text NOT NULL,
	`synced_at` text NOT NULL
);
